/**
 * Runs on the audio rendering thread. Batches mic samples and hands them to
 * the recognizer over a MessagePort, so no audio is ever processed on the
 * thread the game loop runs on.
 *
 * Two details that are easy to get wrong, both verified against the real
 * decoder:
 * - Samples are scaled to 16-bit range here. The library does that inside
 *   acceptWaveformFloat, but its port path forwards chunks untouched; unscaled
 *   audio reaches Vosk as near-silence and every result comes back empty.
 * - Every level message reports how much audio has been sent so far. Vosk's
 *   word times are seconds of audio since the recognizer began, cumulative
 *   across utterances, so `now - audioSec` on the main thread is where that
 *   clock's zero sits on the game clock. It is re-derived on every message:
 *   the worklet's own clock and the main thread's ctx.currentTime were 2.7s
 *   apart on an iPhone, which had put every word before its problem.
 */

// AudioWorkletGlobalScope is not in lib.dom.
declare const currentTime: number
declare const sampleRate: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
  constructor(options?: unknown)
}
declare function registerProcessor(
  name: string,
  ctor: new (options: { processorOptions: CaptureOptions }) => AudioWorkletProcessor,
): void

export interface CaptureOptions {
  recognizerId: string
}

export type CaptureMessage =
  | { type: 'start'; contextTime: number }
  /** `audioSec`: seconds of audio handed to the recognizer so far, which is
      the clock its word times are in. */
  | { type: 'level'; rms: number; audioSec: number }

/** 2048 frames: ~43ms at 48k. Small enough to keep latency low, large enough
    that the per-message cost is noise. */
const BATCH = 2048

class Capture extends AudioWorkletProcessor {
  private out: MessagePort | null = null
  private buf = new Float32Array(BATCH)
  private n = 0
  private sumSq = 0
  private sent = 0
  private started = false
  private readonly recognizerId: string

  constructor(options: { processorOptions: CaptureOptions }) {
    super()
    this.recognizerId = options.processorOptions.recognizerId
    // The recognizer's port arrives by message: ports cannot travel in
    // processorOptions.
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'port') this.out = e.data.port as MessagePort
    }
  }

  process(inputs: Float32Array[][]): boolean {
    const ch = inputs[0]?.[0]
    if (!ch || !this.out) return true

    if (!this.started) {
      this.started = true
      this.port.postMessage({ type: 'start', contextTime: currentTime } satisfies CaptureMessage)
    }

    for (let i = 0; i < ch.length; i++) {
      const v = ch[i]
      this.sumSq += v * v
      this.buf[this.n++] = v * 32768
      if (this.n === BATCH) this.flush()
    }
    return true
  }

  private flush() {
    const data = this.buf
    this.out!.postMessage(
      { action: 'audioChunk', recognizerId: this.recognizerId, data, sampleRate },
      [data.buffer],
    )
    this.sent += BATCH
    this.port.postMessage({ type: 'level', rms: Math.sqrt(this.sumSq / BATCH), audioSec: this.sent / sampleRate } satisfies CaptureMessage)
    this.buf = new Float32Array(BATCH)
    this.n = 0
    this.sumSq = 0
  }
}

registerProcessor('gm-capture', Capture)
