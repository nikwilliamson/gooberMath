import { create } from 'zustand'
import { factsFor } from '@/engine/facts'
import { DEFAULT_CLEAR_RATIO, QUESTS, REGIONS, questById, questsIn, type QuestDef } from '@/engine/quests'
import { learnedCount, learnedRatio } from '@/engine/mastery'
import { UNLOCK_SCORE } from '@/engine/scoring'
import {
  buildCtx, runReducer, startRun, summarize,
  type RunCtx, type RunState, type RunSummary,
} from '@/engine/run'
import type { Mode, Op, StatsMap } from '@/engine/types'
import { COSMETICS, levelFromXp } from './cosmetics'
import { loadSave, saveSoon } from './persist'
import { DEFAULT_SAVE, bestKey, emptyQuest, today, type SaveData, type Settings } from './types'

export type Screen = 'title' | 'map' | 'run' | 'results' | 'stats'
export type QuestStatus = 'locked' | 'open' | 'cleared'

/** Facts live outside the store: they are static per quest and never re-render. */
let ctx: RunCtx | null = null

export const questProgress = (save: SaveData, id: string) => save.quests[id] ?? emptyQuest()

/**
 * Every region is open from the start. Gating subtraction behind all of
 * addition meant three of the four worlds were a locked screen he could not
 * touch, and his teachers do not teach them in that order either. Quests
 * within a region still unlock in sequence.
 */
export function regionOpen(_save: SaveData, _region: Op): boolean {
  return true
}

export function questStatus(save: SaveData, quest: QuestDef): QuestStatus {
  if (questProgress(save, quest.id).cleared) return 'cleared'
  if (!regionOpen(save, quest.region)) return 'locked'
  const siblings = questsIn(quest.region)
  const idx = siblings.findIndex((q) => q.id === quest.id)
  if (idx === 0) return 'open'
  return questProgress(save, siblings[idx - 1].id).cleared ? 'open' : 'locked'
}

/**
 * How much of a quest he has actually learned: the share of its own facts at
 * a mastered tier. This is the completion metric, not the unlock gate — the
 * gate is a fixed Sniper score (UNLOCK_SCORE). Nothing here depends on any
 * other quest, so one quest's result can never move another's bar.
 */
export const factKeysOf = (quest: QuestDef) => factsFor(quest.spec).map((f) => f.key)

export function questMastery(save: SaveData, quest: QuestDef) {
  const keys = factKeysOf(quest)
  const need = quest.clearRatio ?? DEFAULT_CLEAR_RATIO
  const learned = learnedCount(save.stats, keys)
  return {
    learned,
    total: keys.length,
    need,
    required: Math.ceil(keys.length * need),
    ratio: learnedRatio(save.stats, keys),
    met: learnedRatio(save.stats, keys) >= need,
  }
}

export function regionFactKeys(region: Op): string[] {
  const keys = new Set<string>()
  for (const q of questsIn(region)) for (const k of factKeysOf(q)) keys.add(k)
  return [...keys]
}

export interface Awards {
  /** Unlocked the next quest on this run. */
  cleared: boolean
  /** Learned enough of this quest's facts on this run. Gates nothing. */
  mastered: boolean
  newBest: boolean
  perfect: boolean
  xpGained: number
  leveledTo: number | null
  unlocked: string[]
}

interface GameStore {
  ready: boolean
  save: SaveData
  screen: Screen
  run: RunState | null
  summary: RunSummary | null
  awards: Awards | null
  activeQuestId: string | null
  /** Bumped on every answer so the UI can fire effects without diffing. */
  pulse: number

  hydrate: () => Promise<void>
  go: (screen: Screen) => void
  setSettings: (patch: Partial<Settings>) => void
  setCosmetic: (id: string) => void
  replaceSave: (data: SaveData) => void
  toggleForcedRegion: (region: Op) => void

  begin: (questId: string, mode: Mode, untimed: boolean) => void
  /** Re-anchor the clock after the countdown so it does not eat those seconds. */
  arm: (now: number) => void
  tick: (now: number) => void
  digit: (d: number) => void
  backspace: () => void
  /** A whole answer heard by the voice layer. */
  spoken: (value: number, spokeAt: number) => void
  /** Dismiss the held wrong-answer reveal and move to the next problem. */
  advance: () => void
  quit: () => void
}

const commit = (save: SaveData) => {
  saveSoon(save)
  return save
}

export const useGame = create<GameStore>((set, get) => ({
  ready: false,
  save: DEFAULT_SAVE,
  screen: 'title',
  run: null,
  summary: null,
  awards: null,
  activeQuestId: null,
  pulse: 0,

  hydrate: async () => {
    const save = await loadSave()
    set({ save, ready: true })
  },

  go: (screen) => set({ screen }),

  setSettings: (patch) =>
    set((s) => ({ save: commit({ ...s.save, settings: { ...s.save.settings, ...patch } }) })),

  setCosmetic: (id) =>
    set((s) => {
      const c = COSMETICS.find((x) => x.id === id)
      if (!c || !s.save.cosmetics.includes(id)) return s
      const key = c.kind === 'goober' ? 'goober' : c.kind === 'pad' ? 'pad' : null
      if (!key) return s
      return { save: commit({ ...s.save, [key]: id }) }
    }),

  replaceSave: (data) => set({ save: commit(data) }),

  toggleForcedRegion: (region) =>
    set((s) => {
      const has = s.save.forcedRegions.includes(region)
      const forcedRegions = has
        ? s.save.forcedRegions.filter((r) => r !== region)
        : [...s.save.forcedRegions, region]
      return { save: commit({ ...s.save, forcedRegions }) }
    }),

  begin: (questId, mode, untimed) => {
    const quest = questById(questId)
    if (!quest) return
    const { save } = get()
    const started = startRun(quest, save.stats, { mode, untimed, voice: save.settings.voice }, performance.now())
    ctx = started.ctx
    set({ run: started.state, screen: 'run', activeQuestId: questId, summary: null, awards: null })
  },

  arm: (now) =>
    set((s) => (s.run ? { run: { ...s.run, shownAt: now, lastTickAt: now } } : s)),

  tick: (now) => {
    const { run } = get()
    if (!run || !ctx || run.phase === 'over') return
    const next = runReducer(run, { type: 'TICK', now }, ctx)
    if (next === run) return
    if (next.phase === 'over') finish(next, set, get)
    else set({ run: next })
  },

  digit: (d) => {
    const { run } = get()
    if (!run || !ctx || run.phase !== 'playing') return
    const next = runReducer(run, { type: 'DIGIT', d, now: performance.now() }, ctx)
    if (next === run) return
    set((s) => ({ run: next, pulse: next.answers.length !== run.answers.length ? s.pulse + 1 : s.pulse }))
  },

  backspace: () => {
    const { run } = get()
    if (!run || !ctx) return
    set({ run: runReducer(run, { type: 'BACKSPACE' }, ctx) })
  },

  spoken: (value, spokeAt) => {
    const { run } = get()
    if (!run || !ctx || run.phase !== 'playing') return
    const next = runReducer(run, { type: 'SPOKEN', value, spokeAt, now: performance.now() }, ctx)
    if (next === run) return
    set((s) => ({ run: next, pulse: s.pulse + 1 }))
  },

  advance: () => {
    const { run } = get()
    if (!run || !ctx || run.phase !== 'feedback') return
    const next = runReducer(run, { type: 'RESOLVE', now: performance.now() }, ctx)
    if (next.phase === 'over') finish(next, set, get)
    else set({ run: next })
  },

  quit: () => {
    const { run } = get()
    if (!run || !ctx) return set({ screen: 'map', run: null })
    const next = runReducer(run, { type: 'QUIT' }, ctx)
    if (next.answers.length === 0) return set({ screen: 'map', run: null })
    finish(next, set, get)
  },
}))

type SetFn = (partial: Partial<GameStore>) => void
type GetFn = () => GameStore

function finish(state: RunState, set: SetFn, get: GetFn) {
  const summary = summarize(state)
  const { save } = get()
  const quest = questById(state.questId)!
  const prog = questProgress(save, quest.id)

  // Each mode, and each of keys and voice, keeps its own best.
  const best = bestKey(state.mode, state.voice)
  const prevBest = prog[best]
  const newBest = !state.untimed && summary.score > prevBest && prevBest > 0

  const stats: StatsMap = { ...save.stats, ...state.stats }

  // Two separate ideas, on purpose.
  // Unlocking is a fixed score on a real Sniper run, so one good attempt opens
  // the next quest and doing well never raises a later bar.
  const clearedNow =
    !prog.cleared &&
    state.mode === 'sniper' &&
    !state.untimed &&
    summary.score >= (quest.unlockScore ?? UNLOCK_SCORE)

  // Mastery is whether he has actually learned this quest's facts. It gates
  // nothing; it is the thing worth being proud of. A run still has to happen,
  // so mastery carried in from overlapping fact families cannot award a quest
  // he has never played.
  const played = prog.plays > 0 || !state.untimed
  const masteredNow =
    !prog.mastered && played && questMastery({ ...save, stats }, quest).met

  let xpGained = 20 + summary.correct * 2
  if (clearedNow) xpGained += 50
  if (masteredNow) xpGained += 80
  if (summary.perfect && summary.correct > 5) xpGained += 30

  const beforeLevel = levelFromXp(save.xp).level
  const xp = save.xp + xpGained
  const afterLevel = levelFromXp(xp).level
  const unlocked = COSMETICS.filter((c) => c.level > beforeLevel && c.level <= afterLevel).map((c) => c.id)

  const d = save.daily
  const isNewDay = d.date !== today()
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const daily = isNewDay
    ? { date: today(), runs: 1, streakDays: d.lastDate === yesterday ? d.streakDays + 1 : 1, lastDate: today() }
    : { ...d, runs: d.runs + 1, lastDate: today() }

  const nextSave: SaveData = {
    ...save,
    stats,
    xp,
    cosmetics: [...new Set([...save.cosmetics, ...unlocked])],
    daily,
    quests: {
      ...save.quests,
      [quest.id]: {
        ...prog,
        cleared: prog.cleared || clearedNow,
        mastered: prog.mastered || masteredNow,
        practiced: prog.practiced || state.untimed,
        [best]: state.untimed ? prevBest : Math.max(prevBest, summary.score),
        plays: prog.plays + 1,
        perfect: prog.perfect || (summary.perfect && summary.correct > 5),
        // A clean Blitz run on the quest, rather than a score threshold.
        blitzCleared:
          prog.blitzCleared ||
          (state.mode === 'blitz' && summary.correct >= 10 && summary.accuracy >= 0.9),
      },
    },
  }

  set({
    run: null,
    summary,
    screen: 'results',
    save: commit(nextSave),
    awards: {
      cleared: clearedNow,
      mastered: masteredNow,
      newBest,
      perfect: summary.perfect && summary.correct > 5,
      xpGained,
      leveledTo: afterLevel > beforeLevel ? afterLevel : null,
      unlocked,
    },
  })
}

export const allRegions = REGIONS
export const allQuests = QUESTS
export { buildCtx }
