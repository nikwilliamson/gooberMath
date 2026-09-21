/**
 * Is he still making sound? Just enough voice-activity detection to keep a
 * wrong answer held while he is mid-count ("six … seven … eight"), fed by the
 * level the capture worklet already reports every ~43ms.
 *
 * The floor follows quiet fast and loud slowly, so it settles on the room —
 * including music leaking past echo cancellation — but not on speech. Speech is
 * anything clearly above it.
 */

/** Anything below this is silence however quiet the room is. */
const ABS_MIN = 0.008
/** How far above the floor counts as sound. */
const OVER_FLOOR = 2.5

export interface Vad {
  /** Feed one level reading; returns the last time sound was detected. */
  push: (rms: number, now: number) => number
  readonly voicedAt: number
}

export function createVad(initialFloor = 0.01): Vad {
  let floor = initialFloor
  let voicedAt = 0
  return {
    push(rms, now) {
      floor = rms < floor ? floor * 0.8 + rms * 0.2 : floor * 0.995 + rms * 0.005
      if (rms > Math.max(floor * OVER_FLOOR, ABS_MIN)) voicedAt = now
      return voicedAt
    },
    get voicedAt() {
      return voicedAt
    },
  }
}

/**
 * How long he has to be quiet before we tell the recognizer he has finished.
 *
 * Left to itself, Vosk waits out 0.5–0.75s of trailing silence (the model's
 * endpoint rules) before it commits a result, which measured in the app as a
 * median 805ms from his last word to the answer registering. We already know
 * when he stops, so we finalize then instead. 250ms clears the model's 0.15s
 * right-context requirement and the gap inside a plosive like the "t" of
 * "eight", and is still well under Vosk's own wait.
 */
export const FLUSH_QUIET_MS = 250

/**
 * Decides when to force a final result. Fires once per stretch of speech, the
 * first time he has been quiet for FLUSH_QUIET_MS after it. If the room never
 * goes quiet (music bleeding past echo cancellation), it never fires and the
 * recognizer's own endpointing still applies: no worse than without it.
 */
export function createEndpointer(quietMs = FLUSH_QUIET_MS) {
  let pending = false
  let lastVoiced = 0
  return {
    /** Feed the VAD's voicedAt after each reading; true means finalize now. */
    push(voicedAt: number, now: number): boolean {
      if (voicedAt > lastVoiced) {
        lastVoiced = voicedAt
        pending = true
      }
      if (pending && now - lastVoiced >= quietMs) {
        pending = false
        return true
      }
      return false
    },
  }
}
