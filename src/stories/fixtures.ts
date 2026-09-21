/**
 * Story fixtures, built with the engine's own functions so every state here
 * is one the game can actually reach. Nothing in this file is hand-typed run
 * state: a run comes from `startRun`, answers go through `runReducer`, and
 * mastery comes from `recordAnswer`.
 */
import { factsFor } from '@/engine/facts'
import { recordAnswer, emptyStat } from '@/engine/mastery'
import { questById, questsIn, type QuestDef } from '@/engine/quests'
import { buildCtx, runReducer, startRun, summarize, type RunState, type RunSummary } from '@/engine/run'
import type { Mode, Op, StatsMap } from '@/engine/types'
import type { Awards } from '@/store/game'
import { DEFAULT_SAVE, emptyQuest, type QuestProgress, type SaveData } from '@/store/types'

/* -------------------------------------------------------------------------- */
/* Deterministic randomness                                                    */
/* -------------------------------------------------------------------------- */

const prng = (seed: number) => {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** A stable "now" so latencies and timestamps render the same on every run. */
export const NOW = 1_000_000

/* -------------------------------------------------------------------------- */
/* Quests                                                                      */
/* -------------------------------------------------------------------------- */

export const quest = (id: string): QuestDef => {
  const q = questById(id)
  if (!q) throw new Error(`No quest ${id}`)
  return q
}

export const questKeys = (q: QuestDef) => factsFor(q.spec).map((f) => f.key)

/* -------------------------------------------------------------------------- */
/* Stats                                                                       */
/* -------------------------------------------------------------------------- */

export type Fluency = 'new' | 'learning' | 'known' | 'automatic' | 'mixed'

/**
 * Stats for a set of facts at a given fluency, produced by replaying answers
 * through `recordAnswer` so the tiers are whatever `tierOf` says they are.
 */
export function statsAt(keys: string[], fluency: Fluency, seed = 1): StatsMap {
  const rnd = prng(seed)
  const out: StatsMap = {}
  for (const key of keys) {
    const level: Exclude<Fluency, 'mixed'> =
      fluency === 'mixed'
        ? (['new', 'learning', 'known', 'automatic'] as const)[Math.floor(rnd() * 4)]
        : fluency
    if (level === 'new') continue
    let s = emptyStat(key)
    const plays = level === 'learning' ? 2 : 6
    for (let i = 0; i < plays; i++) {
      const ms = level === 'automatic' ? 700 + rnd() * 500 : level === 'known' ? 1800 + rnd() * 900 : 2500 + rnd() * 2500
      const correct = level === 'learning' ? rnd() > 0.4 : true
      s = recordAnswer(s, correct, ms, NOW - (plays - i) * 60_000)
    }
    out[key] = s
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Saves                                                                      */
/* -------------------------------------------------------------------------- */

const progress = (patch: Partial<QuestProgress>): QuestProgress => ({ ...emptyQuest(), ...patch })

export const saves = {
  /** First launch. */
  fresh: (): SaveData => ({ ...DEFAULT_SAVE }),

  /** A few weeks in: Plus Plains mostly cleared, the others barely touched. */
  midway: (): SaveData => ({
    ...DEFAULT_SAVE,
    xp: 640,
    cosmetics: ['goober-classic', 'pad-ink', 'goober-slate', 'pad-chunk'],
    daily: { date: '2026-09-21', runs: 2, streakDays: 4, lastDate: '2026-09-21' },
    stats: {
      ...statsAt(questKeys(quest('add-1')), 'automatic', 11),
      ...statsAt(questKeys(quest('add-2')), 'automatic', 12),
      ...statsAt(questKeys(quest('add-3')), 'known', 13),
      ...statsAt(questKeys(quest('add-4')), 'mixed', 14),
      ...statsAt(questKeys(quest('sub-1')), 'learning', 15),
      ...statsAt(questKeys(quest('mul-1')), 'mixed', 16),
    },
    quests: {
      'add-1': progress({ cleared: true, mastered: true, bestSniper: 4120, bestBlitz: 5210, plays: 9, perfect: true, blitzCleared: true }),
      'add-2': progress({ cleared: true, mastered: true, bestSniper: 3480, bestBlitz: 4010, plays: 6 }),
      'add-3': progress({ cleared: true, bestSniper: 2890, plays: 4 }),
      'add-4': progress({ bestSniper: 1760, bestSniperVoice: 1420, plays: 3 }),
      'sub-1': progress({ bestSniper: 980, plays: 1 }),
      'mul-1': progress({ practiced: true, plays: 1 }),
    },
  }),

  /** Everything cleared and mastered; the map with nothing left to unlock. */
  mastered: (): SaveData => {
    const stats: StatsMap = {}
    const quests: Record<string, QuestProgress> = {}
    let seed = 40
    for (const region of ['add', 'sub', 'mul', 'div'] as Op[]) {
      for (const q of questsIn(region)) {
        Object.assign(stats, statsAt(questKeys(q), 'automatic', seed++))
        quests[q.id] = progress({
          cleared: true, mastered: true, practiced: true, plays: 12, perfect: true, blitzCleared: true,
          bestSniper: 3000 + ((seed * 977) % 3000), bestBlitz: 4000 + ((seed * 613) % 3000),
        })
      }
    }
    return {
      ...DEFAULT_SAVE,
      xp: 5200,
      cosmetics: ['goober-classic', 'pad-ink', 'goober-slate', 'pad-chunk', 'goober-ember', 'sound-arcade', 'goober-void', 'pad-neon', 'sound-bell', 'goober-gold'],
      goober: 'goober-gold',
      daily: { date: '2026-09-21', runs: 5, streakDays: 31, lastDate: '2026-09-21' },
      stats,
      quests,
    }
  },
}

/* -------------------------------------------------------------------------- */
/* Runs                                                                       */
/* -------------------------------------------------------------------------- */

interface RunOpts {
  questId?: string
  mode?: Mode
  untimed?: boolean
  voice?: boolean
  stats?: StatsMap
  seed?: number
}

/** A run at its first problem, exactly as `begin()` would make it. */
export function freshRun({ questId = 'add-3', mode = 'sniper', untimed = false, voice = false, stats = {}, seed = 7 }: RunOpts = {}) {
  const q = quest(questId)
  const { state, ctx } = startRun(q, stats, { mode, untimed, voice, seed }, NOW)
  return { state: { ...state, shownAt: NOW, lastTickAt: NOW }, ctx, quest: q }
}

/** Type the digits of `value` at `ms` after the problem was shown. */
export function answer(state: RunState, ctx: ReturnType<typeof buildCtx>, value: number, ms: number): RunState {
  let s = state
  const now = s.shownAt + ms
  for (const ch of String(value)) s = runReducer(s, { type: 'DIGIT', d: Number(ch), now }, ctx)
  return s
}

/** Answer correctly `n` times, at a plausible speed, leaving the run ready for the next problem. */
export function play(state: RunState, ctx: ReturnType<typeof buildCtx>, n: number, msEach = 1200): RunState {
  let s = state
  for (let i = 0; i < n; i++) {
    const fact = ctx.byKey.get(s.currentKey)!
    s = answer(s, ctx, fact.answer, msEach)
    // Let the correct-answer beat pass so the next problem is on screen.
    s = runReducer(s, { type: 'TICK', now: s.shownAt + msEach + 400 }, ctx)
  }
  return s
}

export const runs = {
  /** Just armed: full clock, first problem, nothing typed. */
  start: (opts?: RunOpts) => freshRun(opts).state,

  /** Mid-run with a streak going and a multiplier lit. */
  streak: (opts?: RunOpts) => {
    const { state, ctx } = freshRun(opts)
    return play(state, ctx, 7, 1100)
  },

  /** One digit of a two-digit answer typed. */
  partialEntry: (opts?: RunOpts) => {
    const { state, ctx } = freshRun({ questId: 'add-5', ...opts })
    const s = play(state, ctx, 3)
    return runReducer(s, { type: 'DIGIT', d: 1, now: s.shownAt + 600 }, ctx)
  },

  /** The held wrong-answer reveal: clock paused, waiting for a tap. */
  heldWrong: (opts?: RunOpts) => {
    const { state, ctx } = freshRun(opts)
    const s = play(state, ctx, 4)
    const fact = ctx.byKey.get(s.currentKey)!
    return answer(s, ctx, fact.answer === 9 ? 8 : 9, 1500)
  },

  /** Under ten seconds left; the timer goes urgent. */
  lastTen: (opts?: RunOpts) => {
    const { state, ctx } = freshRun(opts)
    const s = play(state, ctx, 30, 1000)
    return { ...s, msLeft: 8_400 }
  },

  /** Warm-up: no clock, a count of problems left. */
  untimed: (opts?: RunOpts) => {
    const { state, ctx } = freshRun({ questId: 'mul-1', untimed: true, ...opts })
    return play(state, ctx, 3, 2500)
  },

  /** A voice run, mid-streak. */
  voice: (opts?: RunOpts) => runs.streak({ voice: true, ...opts }),
}

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

const finished = (s: RunState): RunSummary => summarize({ ...s, phase: 'over' })

const awards = (patch: Partial<Awards> = {}): Awards => ({
  cleared: false, mastered: false, newBest: false, perfect: false, xpGained: 44, leveledTo: null, unlocked: [], ...patch,
})

export const results = {
  /** A solid run that unlocks the next quest. */
  cleared: () => {
    const { state, ctx } = freshRun()
    const s = play(state, ctx, 34, 900)
    return { summary: finished(s), awards: awards({ cleared: true, newBest: true, perfect: true, xpGained: 168 }) }
  },

  /** Beat the personal best but not the unlock score. */
  newBest: () => {
    const { state, ctx } = freshRun({ questId: 'add-4' })
    let s = play(state, ctx, 12, 1300)
    const fact = ctx.byKey.get(s.currentKey)!
    s = answer(s, ctx, fact.answer + 1, 1500)
    s = runReducer(s, { type: 'RESOLVE', now: s.shownAt + 4000 }, ctx)
    s = play(s, ctx, 9, 1300)
    return { summary: finished(s), awards: awards({ newBest: true, xpGained: 62 }) }
  },

  /** Levelled up and unlocked a cosmetic. */
  reward: () => {
    const base = results.cleared()
    return { ...base, awards: awards({ ...base.awards, leveledTo: 2, unlocked: ['goober-slate'], xpGained: 190 }) }
  },

  /** Mastery of the quest's facts: the headline it takes over. */
  mastered: () => {
    const base = results.cleared()
    return { ...base, awards: awards({ ...base.awards, mastered: true, xpGained: 248 }) }
  },

  /** A rough run: more misses than hits. */
  badRun: () => {
    const { state, ctx } = freshRun({ questId: 'mul-2' })
    let s = state
    for (let i = 0; i < 8; i++) {
      const fact = ctx.byKey.get(s.currentKey)!
      s = answer(s, ctx, i % 3 === 0 ? fact.answer : fact.answer + 2, 2800)
      s = runReducer(s, { type: 'RESOLVE', now: s.shownAt + 3500 }, ctx)
      s = runReducer(s, { type: 'TICK', now: s.shownAt + 3600 }, ctx)
    }
    return { summary: finished(s), awards: awards({ xpGained: 26 }) }
  },

  /** Warm-up complete. */
  warmup: () => {
    const { state, ctx } = freshRun({ questId: 'mul-1', untimed: true })
    const s = play(state, ctx, 12, 2400)
    return { summary: finished(s), awards: awards({ xpGained: 44 }) }
  },
}
