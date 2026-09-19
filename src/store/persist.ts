import { get, set } from 'idb-keyval'
import { DEFAULT_SAVE, type SaveData } from './types'

const KEY = 'goobermath:save:v1'

export async function loadSave(): Promise<SaveData> {
  try {
    const raw = await get<SaveData>(KEY)
    if (!raw || raw.version !== 1) return { ...DEFAULT_SAVE }
    return {
      ...DEFAULT_SAVE,
      ...raw,
      settings: { ...DEFAULT_SAVE.settings, ...raw.settings },
      daily: { ...DEFAULT_SAVE.daily, ...raw.daily },
    }
  } catch {
    return { ...DEFAULT_SAVE }
  }
}

let queued: SaveData | null = null
let timer: number | null = null

/** Coalesced write: the run loop touches stats on every answer. */
export function saveSoon(data: SaveData) {
  queued = data
  if (timer !== null) return
  timer = window.setTimeout(() => {
    timer = null
    if (queued) void set(KEY, queued).catch(() => {})
    queued = null
  }, 400)
}

export const exportSave = (data: SaveData) => JSON.stringify(data, null, 2)

export function importSave(text: string): SaveData | null {
  try {
    const parsed = JSON.parse(text) as SaveData
    if (parsed.version !== 1 || typeof parsed.stats !== 'object') return null
    return { ...DEFAULT_SAVE, ...parsed }
  } catch {
    return null
  }
}
