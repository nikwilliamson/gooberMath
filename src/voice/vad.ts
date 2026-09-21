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
