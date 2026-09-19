import type { FactKey, FactStat, StatsMap, Tier } from './types'

export const EWMA_ALPHA = 0.3
/** Under this, recall is automatic (Rocket Math's sub-second bar plus tap time). */
export const AUTOMATIC_MS = 1500
/** Over this, he is computing the fact, not retrieving it. */
export const KNOWN_MS = 3000
export const ACC_BAR = 0.9
/** Below this many attempts there is not enough signal to leave 'learning'. */
export const MIN_SEEN = 3

export const emptyStat = (key: FactKey): FactStat => ({
  key, seen: 0, correct: 0, streak: 0, ewmaMs: 0, lastSeenAt: 0,
})

export const statFor = (stats: StatsMap, key: FactKey): FactStat => stats[key] ?? emptyStat(key)

export const accuracyOf = (s: FactStat) => (s.seen === 0 ? 0 : s.correct / s.seen)

export function recordAnswer(s: FactStat, correct: boolean, ms: number, now: number): FactStat {
  // Latency only tracks correct answers; a wrong answer's timing means nothing.
  const ewmaMs = correct ? (s.ewmaMs === 0 ? ms : s.ewmaMs + EWMA_ALPHA * (ms - s.ewmaMs)) : s.ewmaMs
  return {
    key: s.key,
    seen: s.seen + 1,
    correct: s.correct + (correct ? 1 : 0),
    streak: correct ? s.streak + 1 : 0,
    ewmaMs,
    lastSeenAt: now,
  }
}

export function tierOf(s: FactStat): Tier {
  if (s.seen === 0) return 'new'
  if (s.seen < MIN_SEEN) return 'learning'
  const acc = accuracyOf(s)
  if (acc < ACC_BAR || s.ewmaMs === 0 || s.ewmaMs > KNOWN_MS) return 'learning'
  return s.ewmaMs < AUTOMATIC_MS ? 'automatic' : 'known'
}

export const TIER_ORDER: Tier[] = ['new', 'learning', 'known', 'automatic']

export function tierCounts(stats: StatsMap, keys: FactKey[]): Record<Tier, number> {
  const out: Record<Tier, number> = { new: 0, learning: 0, known: 0, automatic: 0 }
  for (const k of keys) out[tierOf(statFor(stats, k))]++
  return out
}

/** Share of a fact list at 'known' or better. This is what clears a quest. */
export function learnedRatio(stats: StatsMap, keys: FactKey[]): number {
  if (keys.length === 0) return 1
  let learned = 0
  for (const k of keys) {
    const t = tierOf(statFor(stats, k))
    if (t === 'known' || t === 'automatic') learned++
  }
  return learned / keys.length
}

export const learnedCount = (stats: StatsMap, keys: FactKey[]) =>
  keys.filter((k) => {
    const t = tierOf(statFor(stats, k))
    return t === 'known' || t === 'automatic'
  }).length

/** 0..1 across a fact list, weighting automatic highest. Drives the region rings. */
export function masteryOf(stats: StatsMap, keys: FactKey[]): number {
  if (keys.length === 0) return 0
  const weight: Record<Tier, number> = { new: 0, learning: 0.33, known: 0.7, automatic: 1 }
  let total = 0
  for (const k of keys) total += weight[tierOf(statFor(stats, k))]
  return total / keys.length
}
