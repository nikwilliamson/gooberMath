import type { Op, StatsMap } from '@/engine/types'

export interface QuestProgress {
  /** Unlock gate passed: a Sniper run reached the unlock score. */
  cleared: boolean
  /** Facts actually learned. Tracked, celebrated, and gates nothing. */
  mastered: boolean
  practiced: boolean
  bestSniper: number
  bestBlitz: number
  plays: number
  perfect: boolean
  blitzCleared: boolean
}

export interface Settings {
  music: boolean
  sfx: boolean
  flashes: boolean
  shake: boolean
  particles: boolean
}

export interface Daily {
  date: string
  runs: number
  streakDays: number
  lastDate: string
}

export interface SaveData {
  version: 1
  stats: StatsMap
  quests: Record<string, QuestProgress>
  xp: number
  cosmetics: string[]
  goober: string
  pad: string
  daily: Daily
  settings: Settings
  /** Grown-up override: regions opened by hand. */
  forcedRegions: Op[]
}

export const emptyQuest = (): QuestProgress => ({
  cleared: false, mastered: false, practiced: false, bestSniper: 0, bestBlitz: 0,
  plays: 0, perfect: false, blitzCleared: false,
})

export const today = () => new Date().toISOString().slice(0, 10)

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  stats: {},
  quests: {},
  xp: 0,
  cosmetics: ['goober-classic', 'pad-ink'],
  goober: 'goober-classic',
  pad: 'pad-ink',
  daily: { date: today(), runs: 0, streakDays: 0, lastDate: '' },
  // He leans into stimulation, so everything is on and loud by default.
  settings: { music: true, sfx: true, flashes: true, shake: true, particles: true },
  forcedRegions: [],
}
