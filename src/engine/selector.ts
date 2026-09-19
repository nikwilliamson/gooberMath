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

export interface SelectorState {
  /** Every fact key in the quest, in order. */
  keys: FactKey[]
  /** Keys currently in rotation. */
  active: FactKey[]
  /** Problems served so far. */
  count: number
  lastKey: FactKey | null
  /** Forced re-appearances: { at: problem index, key }. */
  due: Array<{ at: number; key: FactKey }>
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

export function createSelector(facts: Fact[], stats: StatsMap, gated: boolean, seed = 1): SelectorState {
  const keys = facts.map((f) => f.key)
  // Facts he has already met (fact families overlap across quests) start active.
  const known = keys.filter((k) => tierOf(statFor(stats, k)) !== 'new')
  let active: FactKey[]
  if (!gated) {
    active = keys.slice()
  } else {
    const fresh = keys.filter((k) => !known.includes(k))
    active = [...known, ...fresh.slice(0, Math.max(0, SEED_POOL - known.length))]
    if (active.length === 0) active = keys.slice(0, SEED_POOL)
  }
  return { keys, active, count: 0, lastKey: null, due: [], seed, gated }
}

/**
 * Incremental rehearsal: a new fact only joins the pool once nothing active is
 * still in the learning tier, so he is answering mostly facts he owns.
 */
function maybeIntroduce(sel: SelectorState, stats: StatsMap): SelectorState {
  if (!sel.gated || sel.active.length >= sel.keys.length) return sel
  const stillLearning = sel.active.some((k) => {
    const t = tierOf(statFor(stats, k))
    return t === 'new' || t === 'learning'
  })
  if (stillLearning) return sel
  const next = sel.keys.find((k) => !sel.active.includes(k))
  return next ? { ...sel, active: [...sel.active, next] } : sel
}

export function selectNext(
  sel: SelectorState,
  facts: Fact[],
  stats: StatsMap,
): { key: FactKey; sel: SelectorState } {
  const s = maybeIntroduce(sel, stats)
  const rng = mulberry32(s.seed + s.count * 2654435761)

  // A fact he just missed takes priority the moment it comes due.
  const dueNow = s.due.filter((d) => d.at <= s.count)
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
  for (const k of usable) {
    const t = tierOf(statFor(stats, k))
    ;(t === 'new' || t === 'learning' ? hard : easy).push(k)
  }
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
  if (sel.due.length >= MAX_DUE) return sel
  const rng = mulberry32(sel.seed + sel.count * 40503)
  const gap = RETRY_MIN + Math.floor(rng() * (RETRY_MAX - RETRY_MIN + 1))
  return { ...sel, due: [...sel.due, { at: sel.count + gap, key }] }
}
