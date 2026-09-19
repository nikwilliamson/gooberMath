import { statFor, tierOf } from './mastery'
import type { Fact, FactKey, StatsMap, Tier } from './types'

/** Relative weight inside whichever pool a fact lands in. */
const TIER_WEIGHT: Record<Tier, number> = { new: 1.5, learning: 1, known: 3, automatic: 1 }
/**
 * Share of problems drawn from facts he has not mastered. Incremental rehearsal
 * is roughly 9 known to 1 new; anything much above this and a run stops feeling
 * winnable, which is the whole point of the hit-rate test.
 */
export const HARD_SHARE = 0.22
/** Cap pending forced retries so a bad patch cannot spiral into all-hard. */
export const MAX_DUE = 2
/** A missed fact comes back inside this many problems. */
export const RETRY_MIN = 3
export const RETRY_MAX = 5
/** Gated quests (new content) start this small and grow one fact at a time. */
export const SEED_POOL = 4
/**
 * A gated quest always seeds at least this many facts he has never met, even
 * when it overlaps earlier quests. Without this a boss whose review facts
 * filled the seed pool could go runs without showing a single new fact.
 */
export const MIN_FRESH = 2
/**
 * Incremental rehearsal, as taught: a new fact is shown, then again after one
 * known fact, then again after two more, and only then fades into the pool.
 * Offsets are in problems from the introduction. Without this a new fact was
 * the rarest thing on screen (one draw in five, needing three) and a gated
 * quest surfaced about one fact per run.
 */
export const INTRO_SCHEDULE = [0, 2, 5]
/** At most one new fact enters per this many problems. */
export const INTRO_GAP = 6
/** No new fact enters while this many active facts are still being learned. */
export const MAX_LEARNING = 2

type DueKind = 'retry' | 'intro'

export interface SelectorState {
  /** Every fact key in the quest, in teaching order. */
  keys: FactKey[]
  /** Keys currently in rotation. */
  active: FactKey[]
  /** Problems served so far. */
  count: number
  lastKey: FactKey | null
  /** Forced appearances: { at: problem index, key, kind }. */
  due: Array<{ at: number; key: FactKey; kind: DueKind }>
  /** Problem index of the last introduction, for INTRO_GAP. */
  lastIntroAt: number
  seed: number
  gated: boolean
}

/** Deterministic RNG so runs are reproducible in tests. */
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const isLearning = (stats: StatsMap, k: FactKey) => {
  const t = tierOf(statFor(stats, k))
  return t === 'new' || t === 'learning'
}

const introDues = (key: FactKey, at: number, stagger = 0) =>
  INTRO_SCHEDULE.map((off) => ({ at: at + off + stagger, key, kind: 'intro' as const }))

export function createSelector(facts: Fact[], stats: StatsMap, gated: boolean, seed = 1): SelectorState {
  const keys = facts.map((f) => f.key)
  const base: SelectorState = {
    keys, active: keys.slice(), count: 0, lastKey: null, due: [], lastIntroAt: -INTRO_GAP, seed, gated,
  }
  if (!gated) return base

  // Facts he has already met (fact families overlap across quests) start active.
  const known = keys.filter((k) => tierOf(statFor(stats, k)) !== 'new')
  const fresh = keys.filter((k) => !known.includes(k)).slice(0, Math.max(MIN_FRESH, SEED_POOL - known.length))
  // Staggered so two seeds interleave: A B A B _ A B.
  const due = fresh.flatMap((k, i) => introDues(k, 0, i))
  return { ...base, active: [...known, ...fresh], due, lastIntroAt: fresh.length > 0 ? 0 : -INTRO_GAP }
}

/**
 * Incremental rehearsal: a new fact joins once fewer than MAX_LEARNING active
 * facts are still being learned, no sooner than INTRO_GAP problems after the
 * last one, and is then rehearsed on INTRO_SCHEDULE before it fades into the
 * pool.
 */
function maybeIntroduce(sel: SelectorState, stats: StatsMap): SelectorState {
  if (!sel.gated || sel.active.length >= sel.keys.length) return sel
  if (sel.count - sel.lastIntroAt < INTRO_GAP) return sel
  const learning = sel.active.filter((k) => isLearning(stats, k)).length
  if (learning >= MAX_LEARNING) return sel
  const next = sel.keys.find((k) => !sel.active.includes(k))
  if (!next) return sel
  return {
    ...sel,
    active: [...sel.active, next],
    due: [...sel.due, ...introDues(next, sel.count)],
    lastIntroAt: sel.count,
  }
}

export function selectNext(
  sel: SelectorState,
  facts: Fact[],
  stats: StatsMap,
): { key: FactKey; sel: SelectorState } {
  const s = maybeIntroduce(sel, stats)
  const rng = mulberry32(s.seed + s.count * 2654435761)

  // A fact that is due (just missed, or just introduced) takes priority,
  // oldest first, so staggered introductions actually interleave.
  const dueNow = s.due.filter((d) => d.at <= s.count).sort((x, y) => x.at - y.at)
  const ready = dueNow.find((d) => d.key !== s.lastKey)
  if (ready) {
    return {
      key: ready.key,
      sel: { ...s, due: s.due.filter((d) => d !== ready), count: s.count + 1, lastKey: ready.key },
    }
  }

  const byKey = new Map(facts.map((f) => [f.key, f]))
  const available = s.active.filter((k) => byKey.has(k) && k !== s.lastKey)
  const usable = available.length > 0 ? available : s.active

  // Two-stage draw: decide hard-vs-easy first, then weight inside that pool.
  // Weighting across all tiers at once buries him in the facts he is worst at.
  const hard: FactKey[] = []
  const easy: FactKey[] = []
  for (const k of usable) (isLearning(stats, k) ? hard : easy).push(k)
  const wantHard = rng() < HARD_SHARE
  const candidates =
    hard.length > 0 && (wantHard || easy.length === 0) ? hard : easy.length > 0 ? easy : hard

  let total = 0
  const weights = candidates.map((k) => {
    const w = TIER_WEIGHT[tierOf(statFor(stats, k))]
    total += w
    return w
  })

  let roll = rng() * total
  let picked = candidates[candidates.length - 1]
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) {
      picked = candidates[i]
      break
    }
  }

  return { key: picked, sel: { ...s, count: s.count + 1, lastKey: picked } }
}

/** After an answer: schedule a miss to return within RETRY_MIN..RETRY_MAX. */
export function recordSelection(sel: SelectorState, key: FactKey, correct: boolean): SelectorState {
  if (correct) return sel
  // Only retries count against the cap; an introduction's rehearsals always run.
  if (sel.due.filter((d) => d.kind === 'retry').length >= MAX_DUE) return sel
  const rng = mulberry32(sel.seed + sel.count * 40503)
  const gap = RETRY_MIN + Math.floor(rng() * (RETRY_MAX - RETRY_MIN + 1))
  return { ...sel, due: [...sel.due, { at: sel.count + gap, key, kind: 'retry' }] }
}
