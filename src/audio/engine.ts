/**
 * Everything here is synthesised at runtime: no audio files to load, no
 * latency on the first hit, and hit pitch can follow the combo.
 */

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28]
const BASE_HZ = 261.63 // C4

/** The run track. 60s, so it runs exactly as long as a run does. */
const MUSIC_URL = `${import.meta.env.BASE_URL}audio/ComboUp.m4a`
const MUSIC_BASE_VOLUME = 0.6

const semi = (n: number) => BASE_HZ * Math.pow(2, n / 12)

export type SoundPack = 'pad-ink' | 'sound-arcade' | 'sound-bell'

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private noise: AudioBuffer | null = null
  private music: HTMLAudioElement | null = null
  /** Whether music *should* be playing, so a settings toggle can resume it. */
  private wantMusic = false

  intensity = 0
  sfxEnabled = true
  musicEnabled = true
  pack: SoundPack = 'pad-ink'

  /** Must be called from a user gesture; browsers block audio otherwise. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      this.primeMusic()
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

    this.primeMusic()

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

  private ensureMusic(): HTMLAudioElement | null {
    if (this.music) return this.music
    try {
      const el = new Audio(MUSIC_URL)
      el.preload = 'auto'
      el.volume = MUSIC_BASE_VOLUME
      el.crossOrigin = 'anonymous'
      this.music = el
      return el
    } catch {
      return null
    }
  }

  /**
   * iOS will not start audio outside a user gesture, and the track starts after
   * the countdown, not on the tap. Priming it during the gesture is what makes
   * the later play() work.
   */
  private primeMusic() {
    const el = this.ensureMusic()
    if (!el) return
    el.muted = true
    void el
      .play()
      .then(() => {
        el.pause()
        el.currentTime = 0
        el.muted = false
      })
      .catch(() => {
        el.muted = false
      })
  }

  /** Called when the clock starts, not when the run screen mounts. */
  startMusic(loop = false) {
    this.wantMusic = true
    if (!this.musicEnabled) return
    const el = this.ensureMusic()
    if (!el) return
    el.loop = loop
    el.volume = this.musicVolume()
    try {
      el.currentTime = 0
    } catch {
      /* not seekable yet; it will still start from the top */
    }
    void el.play().catch(() => {
      /* autoplay refused: the run is still perfectly playable in silence */
    })
  }

  stopMusic() {
    this.wantMusic = false
    const el = this.music
    if (!el) return
    el.pause()
    try {
      el.currentTime = 0
    } catch {
      /* ignore */
    }
  }

  private musicVolume() {
    return Math.min(1, MUSIC_BASE_VOLUME + this.intensity * 0.06)
  }

  /** Combo tier lifts the music a little rather than changing the arrangement. */
  setIntensity(level: number) {
    this.intensity = Math.max(0, Math.min(3, level))
    if (this.music) this.music.volume = this.musicVolume()
  }

  applySettings(s: { music: boolean; sfx: boolean }) {
    this.sfxEnabled = s.sfx
    const wasEnabled = this.musicEnabled
    this.musicEnabled = s.music
    if (!s.music) {
      this.music?.pause()
    } else if (!wasEnabled && this.wantMusic) {
      // Turned back on mid-run: pick the track up where it was.
      void this.music?.play().catch(() => {})
    }
  }
}

export const audio = new AudioEngine()
