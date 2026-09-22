import { VoskClient, type KaldiRecognizer, type ServerMessageResult } from '@lichess-org/vosk-browser'
import voskWorkerUrl from '@lichess-org/vosk-browser/dist/vosk.worker.js?url'
import voskWasmUrl from '@lichess-org/vosk-browser/dist/vosk.wasm?url'
import captureUrl from './capture.worklet.ts?worker&url'
import type { CaptureMessage } from './capture.worklet'
import { vlog } from './debug'
import { grammarFor } from './numbers'
import { MIC_CONSTRAINTS } from './permission'
import { micLevel, setVoiceStatus } from './status'
import { audio } from '@/audio/engine'
import type { HeardWord } from './voice'

/**
 * Everything that touches the recognizer, the mic and the audio graph. Loaded
 * only through a dynamic import once voice is switched on.
 *
 * Lifetimes:
 * - The model (a worker plus ~40MB of WASM heap) loads once and lives across
 *   runs. Loading it is the slow part, so it starts when voice is switched on.
 * - The mic, worklet and recognizer live for exactly one run. The mic opens as
 *   the countdown starts, so iOS's slow first capture lands in the 3-2-1, and
 *   it is released the moment the run ends: the recording indicator should
 *   never show on the map.
 */

interface ModelInfo {
  name: string
  file: string
  bytes: number
  hasUnk: boolean
}

export class VoiceError extends Error {
  constructor(readonly code: 'missing' | 'load' | 'denied' | 'mic') {
    super(code)
  }
}

const BASE = import.meta.env.BASE_URL
/** The worker resolves URLs against its own script under /assets/, so every
    URL handed to it has to be absolute. */
const absolute = (path: string) => new URL(path, window.location.href).toString()

const LOAD_TIMEOUT_MS = 180_000

let model: Promise<{ client: VoskClient; info: ModelInfo }> | null = null

/** Idempotent. Resolves when the recognizer is ready; safe to call early. */
export function loadModel() {
  if (model) return model
  const started = performance.now()
  setVoiceStatus({ model: 'loading', error: null })

  model = (async () => {
    const res = await fetch(`${BASE}voice/model.json`, { cache: 'no-cache' }).catch(() => null)
    if (!res?.ok) throw new VoiceError('missing')
    const info = (await res.json()) as ModelInfo

    // Not createVoskClient: it only listens for 'load', and a failed download
    // is reported as 'error', so its promise never settles.
    const client = new VoskClient({
      // Pinned per model version: it is also the IndexedDB cache key.
      modelUrl: absolute(`${BASE}voice/${info.file}`),
      workerUrl: absolute(voskWorkerUrl),
      wasmUrl: absolute(voskWasmUrl),
      logLevel: -1,
    })
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new VoiceError('load')), LOAD_TIMEOUT_MS)
      client.on('load', (m) => {
        window.clearTimeout(timer)
        if ('result' in m && m.result) resolve()
        else reject(new VoiceError('load'))
      })
      client.on('error', (m) => {
        window.clearTimeout(timer)
        vlog('model-error', { error: 'error' in m ? m.error : String(m) })
        reject(new VoiceError('load'))
      })
    })
    return { client, info }
  })()

  model.then(
    ({ info }) => {
      setVoiceStatus({ model: 'ready' })
      vlog('model-ready', { ms: Math.round(performance.now() - started), model: info.name, hasUnk: info.hasUnk })
    },
    (err: unknown) => {
      model = null // allow a retry
      const code = err instanceof VoiceError ? err.code : 'load'
      setVoiceStatus({ model: code === 'missing' ? 'missing' : 'error', error: String(err) })
      vlog('model-failed', { code })
    },
  )
  return model
}

// --- iOS audio session ------------------------------------------------------

type AudioSessionNav = Navigator & { audioSession?: { type: string } }

/** iOS 17+. Declaring play-and-record before the mic opens gives iOS the
    routing intent up front; without it, game audio can drop to the earpiece
    on iPhone once the mic is live. Feature-detected: absent is fine. */
function setAudioSession(type: 'play-and-record' | 'auto') {
  const session = (navigator as AudioSessionNav).audioSession
  if (!session) return
  try {
    session.type = type
  } catch {
    /* unsupported value on this version: routing is left to iOS */
  }
}

// --- one run ----------------------------------------------------------------

export interface MicSession {
  close: () => void
  /** Finalize whatever he has said so far, now, rather than waiting out the
      recognizer's own trailing-silence timer. */
  flush: () => void
}

const workletLoaded = new WeakSet<BaseAudioContext>()

export async function openMic(
  onFinal: (words: HeardWord[], now: number) => void,
  onLevel: (rms: number, now: number) => void,
): Promise<MicSession> {
  setVoiceStatus({ mic: 'opening' })
  const { client, info } = await loadModel()

  setAudioSession('play-and-record')
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS })
  } catch (err) {
    setAudioSession('auto')
    const denied = err instanceof DOMException && err.name === 'NotAllowedError'
    setVoiceStatus({ mic: denied ? 'denied' : 'error', error: String(err) })
    throw new VoiceError(denied ? 'denied' : 'mic')
  }

  // The mic can re-clock the hardware; the engine rebuilds its context if so.
  const ctx = audio.afterMicOpened()
  if (!ctx) {
    stream.getTracks().forEach((t) => t.stop())
    setAudioSession('auto')
    setVoiceStatus({ mic: 'error', error: 'no audio context' })
    throw new VoiceError('mic')
  }

  if (!workletLoaded.has(ctx)) {
    await ctx.audioWorklet.addModule(captureUrl)
    workletLoaded.add(ctx)
  }
  // 'interrupted' is iOS's state after a call; it needs the same resume.
  if ((ctx.state as string) !== 'running') await ctx.resume().catch(() => {})

  // Vosk resamples to the model's 16k itself; hand it the context's own rate.
  const rec: KaldiRecognizer = new client.KaldiRecognizer(ctx.sampleRate, JSON.stringify(grammarFor(info.hasUnk)))
  rec.setWords(true)

  // Audio thread → (port) → main thread relay → recognizer worker. The relay
  // is the library's: it transfers each buffer, no copy and no processing.
  const channel = new MessageChannel()
  client.registerPort(channel.port2)

  const node = new AudioWorkletNode(ctx, 'gm-capture', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
    processorOptions: { recognizerId: rec.id },
  })
  node.port.postMessage({ type: 'port', port: channel.port1 }, [channel.port1])

  // Safari only pulls audio through nodes that reach the destination, so the
  // capture node is connected through a silent gain. Nothing is heard.
  const sink = ctx.createGain()
  sink.gain.value = 0
  node.connect(sink).connect(ctx.destination)

  /** performance.now() of the first sample the recognizer received. */
  let origin = performance.now()
  node.port.onmessage = (e: MessageEvent<CaptureMessage>) => {
    const m = e.data
    if (m.type === 'start') {
      origin = performance.now() - (ctx.currentTime - m.contextTime) * 1000
      vlog('mic-start', { sampleRate: ctx.sampleRate, originSkewMs: Math.round((ctx.currentTime - m.contextTime) * 1000) })
    } else if (m.type === 'level') {
      micLevel.set(Math.min(1, m.rms * 8))
      onLevel(m.rms, performance.now())
    }
  }

  rec.on('result', (m) => {
    const result = (m as ServerMessageResult).result
    const now = performance.now()
    const words: HeardWord[] = (result.result ?? []).map((w) => ({
      word: w.word,
      conf: w.conf,
      startMs: origin + w.start * 1000,
      endMs: origin + w.end * 1000,
    }))
    vlog('final', {
      text: result.text,
      words: words.map((w) => ({ w: w.word, c: +w.conf.toFixed(2), s: Math.round(w.startMs), e: Math.round(w.endMs) })),
      lagMs: words.length ? Math.round(now - words[words.length - 1].endMs) : null,
    })
    onFinal(words, now)
  })
  rec.on('error', (m) => vlog('recognizer-error', { error: 'error' in m ? m.error : '' }))

  const source = ctx.createMediaStreamSource(stream)
  source.connect(node)
  setVoiceStatus({ mic: 'listening', error: null })

  let closed = false
  return {
    flush() {
      if (!closed) rec.retrieveFinalResult()
    },
    close() {
      if (closed) return
      closed = true
      source.disconnect()
      node.disconnect()
      node.port.onmessage = null
      node.port.close()
      channel.port2.onmessage = null
      stream.getTracks().forEach((t) => t.stop())
      rec.remove()
      setAudioSession('auto')
      micLevel.set(0)
      setVoiceStatus({ mic: 'off', level: 0 })
      vlog('mic-closed')
    },
  }
}

/**
 * Remove the stored model. The worker keeps it in an Emscripten IDBFS mounted
 * at /vosk, which is an IndexedDB database of that name.
 */
export async function deleteModel() {
  const loaded = await model?.catch(() => null)
  loaded?.client.terminate()
  model = null
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('/vosk')
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
  setVoiceStatus({ model: 'idle' })
}
