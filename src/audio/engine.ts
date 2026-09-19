/**
 * Everything here is synthesised at runtime: no audio files to load, no
 * latency on the first hit, and hit pitch can follow the combo.
 */

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28]
const BASE_HZ = 261.63 // C4
const BPM = 128
const BEAT = 60 / BPM
const STEP = BEAT / 4 // 16th notes
const PATTERN_STEPS = 32
/** Root note per bar, in semitones from C. A tiny four-chord loop. */
const PROGRESSION = [0, -3, -5, -1]

const semi = (n: number) => BASE_HZ * Math.pow(2, n / 12)

export type SoundPack = 'pad-ink' | 'sound-arcade' | 'sound-bell'

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private noise: AudioBuffer | null = null
  private timer: number | null = null
  private nextStepTime = 0
  private step = 0
  private playing = false

  intensity = 0
  sfxEnabled = true
  musicEnabled = true
  pack: SoundPack = 'pad-ink'

  /** Must be called from a user gesture; browsers block audio otherwise. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)

    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = 0.34
    this.musicGain.connect(this.master)

    this.sfxGain = ctx.createGain()
    this.sfxGain.gain.value = 0.85
    this.sfxGain.connect(this.master)

    const len = Math.floor(ctx.sampleRate * 0.5)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noise = buf
  }

  private env(node: AudioNode, at: number, peak: number, attack: number, decay: number) {
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
    node.connect(g)
    return g
  }

  private tone(
    at: number,
    hz: number,
    { type = 'triangle' as OscillatorType, peak = 0.3, attack = 0.005, decay = 0.25, glide = 0, dest = this.sfxGain },
  ) {
    if (!this.ctx || !dest) return
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(hz, at)
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, hz * glide), at + attack + decay)
    const g = this.env(osc, at, peak, attack, decay)
    g.connect(dest)
    osc.start(at)
    osc.stop(at + attack + decay + 0.05)
  }

  private burst(at: number, { peak = 0.3, decay = 0.08, hp = 2000, dest = this.sfxGain }) {
    if (!this.ctx || !this.noise || !dest) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = hp
    src.connect(filter)
    const g = this.env(filter, at, peak, 0.002, decay)
    g.connect(dest)
    src.start(at)
    src.stop(at + decay + 0.05)
  }

  /** Correct answer. Pitch climbs with the streak so a combo sounds like a run. */
  hit(streak: number) {
    if (!this.sfxEnabled) return
    this.unlock()
    if (!this.ctx) return
    const at = this.ctx.currentTime
    const idx = Math.min(PENTATONIC.length - 1, streak)
    const hz = semi(PENTATONIC[idx])
    if (this.pack === 'sound-bell') {
      this.tone(at, hz * 2, { type: 'sine', peak: 0.3, decay: 0.5 })
      this.tone(at, hz * 3, { type: 'sine', peak: 0.1, decay: 0.35 })
    } else if (this.pack === 'sound-arcade') {
      this.tone(at, hz, { type: 'square', peak: 0.16, decay: 0.12 })
      this.tone(at + 0.05, hz * 1.5, { type: 'square', peak: 0.12, decay: 0.12 })
    } else {
      this.tone(at, hz, { type: 'triangle', peak: 0.32, decay: 0.22 })
      this.tone(at, hz * 2, { type: 'sine', peak: 0.12, decay: 0.16 })
    }
    this.burst(at, { peak: 0.08, decay: 0.05, hp: 6000 })
  }

  /** Wrong answer: a soft thunk, never a buzzer. */
  miss() {
    if (!this.sfxEnabled) return
    this.unlock()
    if (!this.ctx) return
    const at = this.ctx.currentTime
    this.tone(at, 180, { type: 'sine', peak: 0.3, decay: 0.28, glide: 0.55 })
    this.burst(at, { peak: 0.05, decay: 0.09, hp: 700 })
  }

  tap() {
    if (!this.sfxEnabled) return
    this.unlock()
    if (!this.ctx) return
    this.burst(this.ctx.currentTime, { peak: 0.05, decay: 0.03, hp: 4000 })
  }

  fanfare(big = false) {
    if (!this.sfxEnabled) return
    this.unlock()
    if (!this.ctx) return
    const at = this.ctx.currentTime
    const notes = big ? [0, 4, 7, 12, 16, 19, 24] : [0, 4, 7, 12]
    notes.forEach((n, i) => {
      this.tone(at + i * 0.075, semi(n), { type: 'triangle', peak: 0.3, decay: 0.45 })
      this.tone(at + i * 0.075, semi(n + 12), { type: 'sine', peak: 0.1, decay: 0.3 })
    })
  }

  countdownBeep(final = false) {
    if (!this.sfxEnabled) return
    this.unlock()
    if (!this.ctx) return
    this.tone(this.ctx.currentTime, final ? semi(12) : semi(0), { type: 'square', peak: 0.2, decay: 0.18 })
  }

  // --- music ---------------------------------------------------------------

  startMusic() {
    if (!this.musicEnabled || this.playing) return
    this.unlock()
    if (!this.ctx) return
    this.playing = true
    this.step = 0
    this.nextStepTime = this.ctx.currentTime + 0.1
    this.timer = window.setInterval(() => this.schedule(), 25)
  }

  stopMusic() {
    this.playing = false
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  setIntensity(level: number) {
    this.intensity = Math.max(0, Math.min(3, level))
    if (this.musicGain && this.ctx) {
      const target = 0.3 + this.intensity * 0.045
      this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2)
    }
  }

  private schedule() {
    if (!this.ctx || !this.playing) return
    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextStepTime)
      this.step = (this.step + 1) % PATTERN_STEPS
      this.nextStepTime += STEP
    }
  }

  private playStep(step: number, at: number) {
    const dest = this.musicGain!
    const bar = Math.floor(step / 8) % PROGRESSION.length
    const root = PROGRESSION[bar]
    const inBar = step % 8

    // Kick on the downbeats, plus a push on the "and" of 3 at high intensity.
    if (inBar === 0 || inBar === 4 || (this.intensity >= 2 && inBar === 7)) {
      this.tone(at, 140, { type: 'sine', peak: 0.7, attack: 0.002, decay: 0.16, glide: 0.3, dest })
    }
    // Hats on eighths; sixteenths once it gets going.
    if (step % 2 === 0 || this.intensity >= 2) {
      this.burst(at, { peak: this.intensity >= 2 ? 0.05 : 0.035, decay: 0.03, hp: 8000, dest })
    }
    // Clap on the backbeat.
    if (this.intensity >= 1 && inBar === 4) {
      this.burst(at, { peak: 0.14, decay: 0.12, hp: 1800, dest })
    }
    // Bass pulse.
    if (inBar === 0 || inBar === 3 || inBar === 6) {
      this.tone(at, semi(root - 24), { type: 'sawtooth', peak: 0.2, attack: 0.01, decay: 0.2, dest })
    }
    // Arp once the combo is up.
    if (this.intensity >= 2 && step % 2 === 1) {
      const shape = [0, 4, 7, 12, 7, 4][(step / 2 | 0) % 6]
      this.tone(at, semi(root + shape), { type: 'square', peak: 0.075, attack: 0.004, decay: 0.1, dest })
    }
    if (this.intensity >= 3 && step % 4 === 2) {
      this.tone(at, semi(root + 19), { type: 'triangle', peak: 0.07, attack: 0.004, decay: 0.14, dest })
    }
  }

  applySettings(s: { music: boolean; sfx: boolean }) {
    this.sfxEnabled = s.sfx
    this.musicEnabled = s.music
    if (!s.music) this.stopMusic()
  }
}

export const audio = new AudioEngine()
