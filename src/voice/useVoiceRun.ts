import { useEffect, useRef } from 'react'
import { audio } from '@/audio/engine'
import { useGame } from '@/store/game'
import { useRaf } from '@/ui/hooks'
import { removeLocal, writeLocal } from '@/ui/safeStorage'
import { vlog } from './debug'
import { VOICE_RUN_KEY, setVoiceStatus } from './status'
import { createEndpointer, createVad } from './vad'
import { initialVoice, voiceStep, type HeardWord, type VoiceEvent } from './voice'

interface Props {
  enabled: boolean
  /** Countdown finished and a problem is on screen waiting for an answer. */
  playing: boolean
  answer: number
  shownAt: number
}

export function useVoiceRun({ enabled, playing, answer, shownAt }: Props) {
  const state = useRef(initialVoice)
  /** Whether he is still making sound: keeps a wrong answer held mid-count. */
  const vad = useRef(createVad())

  const dispatch = (e: VoiceEvent) => {
    const step = voiceStep(state.current, e)
    state.current = step.state
    if (!step.out) return
    const { kind: outcome, ...detail } = step.out
    vlog('decision', { outcome, ...detail, answer, voicedAt: Math.round(vad.current.voicedAt) })
    if (step.out.kind === 'answer') useGame.getState().spoken(step.out.value, step.out.spokeAt)
    else setVoiceStatus({ unsureAt: performance.now() })
  }
  // Results arrive from the recognizer long after render; always use the latest.
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  // The mic opens as the countdown starts and closes with the run.
  useEffect(() => {
    if (!enabled) return
    // The context exists from the tap that started the run; the mic joins it.
    if (!audio.context()) return

    let session: { close: () => void; flush: () => void } | null = null
    const endpointer = createEndpointer()
    let cancelled = false
    const clearGuard = () => removeLocal(VOICE_RUN_KEY)
    writeLocal(VOICE_RUN_KEY, String(Date.now()))
    window.addEventListener('pagehide', clearGuard)

    vad.current = createVad()
    void import('./listener')
      .then(({ openMic }) =>
        openMic(
          (words: HeardWord[], now: number) => dispatchRef.current({ type: 'FINAL', words, now }),
          (rms, now) => {
            const before = vad.current.voicedAt
            const after = vad.current.push(rms, now)
            // He has stopped: have the recognizer commit now, not ~0.6s later.
            if (endpointer.push(after, now)) {
              session?.flush()
              vlog('flush', { quietMs: Math.round(now - after) })
            }
            // Log sound starting and stopping, not every reading: at ~23 a
            // second, readings would push everything useful out of the log.
            const wasVoiced = now - before < 120
            const isVoiced = after === now
            if (isVoiced !== wasVoiced) vlog(isVoiced ? 'sound' : 'quiet', { rms: +rms.toFixed(3) })
          },
        ),
      )
      .then((s) => {
        if (cancelled) s.close()
        else session = s
      })
      .catch((err: unknown) => {
        // The run carries on with the keypad; status explains why on the map.
        vlog('mic-open-failed', { error: String(err) })
      })

    // iOS stops capture when the app is backgrounded and does not reliably
    // restart it; close cleanly rather than leave a dead stream open.
    const onHide = () => {
      if (document.visibilityState === 'hidden') session?.close()
    }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      cancelled = true
      session?.close()
      clearGuard()
      window.removeEventListener('pagehide', clearGuard)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [enabled])

  // One decision per problem: a new problem opens it, anything else closes it.
  useEffect(() => {
    if (!enabled) return
    dispatchRef.current(playing ? { type: 'PROBLEM', answer, shownAt } : { type: 'CLOSE' })
  }, [enabled, playing, answer, shownAt])

  // Drives the hold on wrong answers.
  useRaf((now) => {
    if (state.current.held) dispatchRef.current({ type: 'TICK', now, voicedAt: vad.current.voicedAt })
  }, enabled && playing)
}
