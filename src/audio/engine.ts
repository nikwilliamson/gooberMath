/**
 * One AudioContext for everything: sound effects are synthesised on it, the
 * run track is a decoded buffer played through it, and the mic joins it for
 * voice runs. One context means one route — on an iPhone with the mic live,
 * a bare <audio> element could drop to the earpiece while the effects stayed
 * on the speaker; here they cannot diverge.
 *
 * iOS specifics this is built around:
 * - Nothing plays until the context is created or resumed inside a tap.
 * - Opening the mic switches the audio session to play-and-record, which can
 *   re-clock the hardware. A context created before that then renders at the
 *   wrong rate (pitched, crackling, or silent). After the mic opens, the
 *   listener calls `afterMicOpened()`, which rebuilds the context if the rate
 *   changed and picks the music back up where it was.
 * - A phone call or Siri leaves the context `interrupted` (not `suspended`);
 *   both are resumed.
 */

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28]
const BASE_HZ = 261.63 // C4

/** The run track. 60s, so it runs exactly as long as a run does. */
const MUSIC_URL = `${import.meta.env.BASE_URL}audio/ComboUp.m4a`
const MUSIC_BASE_VOLUME = 0.6
/** Gain moves are smoothed over this many seconds; no zipper noise. */
const GAIN_SMOOTH_S = 0.05

const semi = (n: number) => BASE_HZ * Math.pow(2, n / 12)

export type SoundPack = 'pad-ink' | 'sound-arcade' | 'sound-bell'

type Ctor = typeof AudioContext

const contextCtor = (): Ctor | null =>
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext ?? null

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private noise: AudioBuffer | null = null

  private musicBuffer: AudioBuffer | null = null
  private musicLoad: Promise<AudioBuffer | null> | null = null
  private musicSource: AudioBufferSourceNode | null = null
  /** Whether music *should* be playing, so a settings toggle can resume it. */
  private wantMusic = false
  private musicLoop = false
  /** performance.now() when the current run's track logically started. */
  private musicStartedAt = 0

  intensity = 0
  sfxEnabled = true
  musicEnabled = true
  pack: SoundPack = 'pad-ink'

  constructor() {
    // Coming back from the background or a call: the context may need a nudge.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.resume()
      })
    }
  }

  /** Must be called from a user gesture the first time; browsers block audio otherwise. */
  unlock() {
    if (this.ctx) {
      this.resume()
      return
    }
    const Ctor = contextCtor()
    if (!Ctor) return
    this.build(new Ctor())
  }

  /** The shared context, created on first use. Call from a gesture the first time. */
  context(): AudioContext | null {
    this.unlock()
    return this.ctx
  }

  private resume() {
    const ctx = this.ctx
    if (!ctx) return
    // 'interrupted' is iOS's own state after a call or Siri; it is not in lib.dom.
    if ((ctx.state as string) !== 'running') void ctx.resume().catch(() => {})
  }

  private build(ctx: AudioContext) {
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)

    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = this.musicEnabled ? this.musicVolume() : 0
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

  /**
   * Call once the mic stream is open. If the hardware rate changed underneath
   * the context, rebuild it on the new rate; the music, if playing, resumes at
   * the point it had reached. Returns the live context.
   */
  afterMicOpened(): AudioContext | null {
    const Ctor = contextCtor()
    if (!Ctor || !this.ctx) return this.ctx
    const probe = new Ctor()
    if (probe.sampleRate === this.ctx.sampleRate) {
      void probe.close()
      this.resume()
      return this.ctx
    }
    const old = this.ctx
    this.musicSource?.stop()
    this.musicSource = null
    this.build(probe)
    this.resume()
    void old.close().catch(() => {})
    if (this.wantMusic && this.musicEnabled) void this.playMusic()
    return this.ctx
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

  /**
   * Fetch and decode the track. Idempotent; call from the taps that lead to a
   * run so it is in memory before the countdown ends. One plain fetch, which
   * the service worker caches whole — unlike a media element's range requests,
   * which it never could.
   */
  primeMusic() {
    void this.loadMusic()
  }

  private loadMusic(): Promise<AudioBuffer | null> {
    if (this.musicLoad) return this.musicLoad
    this.musicLoad = (async () => {
      try {
        const res = await fetch(MUSIC_URL)
        if (!res.ok) throw new Error(String(res.status))
        const bytes = await res.arrayBuffer()
        this.unlock()
        if (!this.ctx) throw new Error('no context')
        this.musicBuffer = await this.ctx.decodeAudioData(bytes)
        return this.musicBuffer
      } catch {
        this.musicLoad = null // allow a retry on the next tap
        return null
      }
    })()
    return this.musicLoad
  }

  /** Seconds into the track the run has reached. */
  private musicOffset() {
    return Math.max(0, (performance.now() - this.musicStartedAt) / 1000)
  }

  /**
   * Start the buffer from wherever the run has reached. If the decode is still
   * in flight (a first visit on a slow connection), the track joins late but
   * in time with the clock rather than from the top.
   */
  private async playMusic() {
    const buf = await this.loadMusic()
    if (!buf || !this.wantMusic || !this.musicEnabled || !this.ctx || !this.musicGain) return
    this.musicSource?.stop()
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = this.musicLoop
    src.connect(this.musicGain)
    const offset = this.musicOffset()
    if (!this.musicLoop && offset >= buf.duration) return
    src.start(0, this.musicLoop ? offset % buf.duration : offset)
    src.onended = () => {
      if (this.musicSource === src) this.musicSource = null
    }
    this.musicSource = src
    this.resume()
  }

  /** Called when the clock starts, not when the run screen mounts. */
  startMusic(loop = false) {
    this.wantMusic = true
    this.musicLoop = loop
    this.musicStartedAt = performance.now()
    this.applyMusicVolume()
    void this.playMusic()
  }

  stopMusic() {
    this.wantMusic = false
    this.musicSource?.stop()
    this.musicSource = null
  }

  private musicVolume() {
    return Math.min(1, MUSIC_BASE_VOLUME + this.intensity * 0.06)
  }

  private applyMusicVolume() {
    if (!this.ctx || !this.musicGain) return
    const target = this.musicEnabled ? this.musicVolume() : 0
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, GAIN_SMOOTH_S)
  }

  /** Combo tier lifts the music a little rather than changing the arrangement. */
  setIntensity(level: number) {
    const next = Math.max(0, Math.min(3, level))
    if (next === this.intensity) return
    this.intensity = next
    this.applyMusicVolume()
  }

  applySettings(s: { music: boolean; sfx: boolean }) {
    this.sfxEnabled = s.sfx
    const wasEnabled = this.musicEnabled
    this.musicEnabled = s.music
    this.applyMusicVolume()
    if (!s.music) {
      this.musicSource?.stop()
      this.musicSource = null
    } else if (!wasEnabled && this.wantMusic) {
      // Turned back on mid-run: pick the track up where it would be.
      void this.playMusic()
    }
  }
}

export const audio = new AudioEngine()
