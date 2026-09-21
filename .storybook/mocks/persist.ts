/**
 * Storybook stand-in for src/store/persist.ts: nothing is read from or written
 * to IndexedDB, so stories can never touch a real save.
 */
import { DEFAULT_SAVE, type SaveData } from '@/store/types'

export async function loadSave(): Promise<SaveData> {
  return { ...DEFAULT_SAVE }
}

export function saveSoon(_data: SaveData) {}

export async function flushSave(): Promise<void> {}

export const exportSave = (data: SaveData) => JSON.stringify(data, null, 2)

export function importSave(text: string): SaveData | null {
  try {
    const parsed = JSON.parse(text) as SaveData
    return parsed.version === 1 ? { ...DEFAULT_SAVE, ...parsed } : null
  } catch {
    return null
  }
}
