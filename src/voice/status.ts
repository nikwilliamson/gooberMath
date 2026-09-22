import { create } from 'zustand'

/**
 * Voice state the UI reads. Deliberately free of any recognizer import, so the
 * map and HUD can use it without pulling the speech code into the main bundle;
 * that loads only when voice is switched on.
 */

export type ModelStatus =
  | 'idle'
  /** First time: downloading ~40MB, then unpacking. Cached after that. */
  | 'loading'
  | 'ready'
  /** This build was deployed without the model (e.g. local dev). */
  | 'missing'
  | 'error'

export type MicStatus = 'off' | 'opening' | 'listening' | 'denied' | 'error'

interface VoiceStatus {
  model: ModelStatus
  /** The load in progress is the first on this device: a ~30MB download,
      not a cache read. The map says so, because it can take a while. */
  downloading: boolean
  /** The permission prompt is up (asked from the toggle or from Play). */
  priming: boolean
  mic: MicStatus
  /** 0..1, the level the indicator starts at. Live readings go through
      `micLevel`, ~23 a second, and never through React. */
  level: number
  /** When the recognizer last heard a number it was not sure of. */
  unsureAt: number
  error: string | null
  set: (patch: Partial<Omit<VoiceStatus, 'set'>>) => void
}

export const useVoiceStatus = create<VoiceStatus>((set) => ({
  model: 'idle',
  downloading: false,
  priming: false,
  mic: 'off',
  level: 0,
  unsureAt: 0,
  error: null,
  set: (patch) => set(patch),
}))

export const setVoiceStatus = (patch: Partial<Omit<VoiceStatus, 'set'>>) =>
  useVoiceStatus.getState().set(patch)

/**
 * Set while a voice run is in progress and cleared when it ends, including on
 * a normal page unload. If the app boots and finds it, iOS killed the tab mid
 * run (most likely for memory, on an older iPhone), and voice is switched off
 * rather than crashing again on the next run.
 */
export const VOICE_RUN_KEY = 'goobermath:voice-run'
/** Shown on the map until voice is switched back on. */
export const VOICE_CRASHED_KEY = 'goobermath:voice-crashed'

/**
 * The mic level, ~23 readings a second while listening. Not store state: a
 * store update re-renders every subscriber, and the only consumer is one
 * CSS variable on the HUD chip. Subscribers write to the DOM directly.
 */
type LevelListener = (level: number) => void
const levelListeners = new Set<LevelListener>()
export const micLevel = {
  value: 0,
  set(level: number) {
    this.value = level
    for (const l of levelListeners) l(level)
  },
  subscribe(fn: LevelListener) {
    levelListeners.add(fn)
    return () => void levelListeners.delete(fn)
  },
}
