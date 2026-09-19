import type { Mode } from './types'

export const RUN_MS = 60_000
/** Sniper: a miss costs this much clock. Tunable; see the plan's pass-2 note. */
export const WRONG_PENALTY_MS = 3000
export const BASE_POINTS = 100
/** Speed bonus decays to zero across this window. */
export const SPEED_WINDOW_MS = 3000

export const COMBO_STEPS: Array<{ at: number; mult: number }> = [
  { at: 20, mult: 3 },
  { at: 10, mult: 2 },
  { at: 5, mult: 1.5 },
  { at: 0, mult: 1 },
]

export function comboMult(streak: number): number {
  for (const s of COMBO_STEPS) if (streak >= s.at) return s.mult
  return 1
}

/** Progress 0..1 toward the next combo step, for the meter fill. */
export function comboProgress(streak: number): number {
  const next = [...COMBO_STEPS].reverse().find((s) => streak < s.at)
  if (!next) return 1
  const prev = COMBO_STEPS.find((s) => streak >= s.at)!
  return (streak - prev.at) / (next.at - prev.at)
}

export const speedBonus = (ms: number) =>
  Math.round(BASE_POINTS * Math.max(0, Math.min(1, 1 - ms / SPEED_WINDOW_MS)))

export interface ScoreInput {
  mode: Mode
  ms: number
  /** Streak BEFORE this answer. */
  streak: number
  /** Run accuracy INCLUDING this answer, 0..1. Sniper only. */
  accuracy: number
}

export function scoreAnswer({ mode, ms, streak, accuracy }: ScoreInput): number {
  const mult = comboMult(streak)
  if (mode === 'blitz') return Math.round((BASE_POINTS + speedBonus(ms)) * mult)
  // Sniper trades the speed bonus for an accuracy multiplier, so precision compounds.
  return Math.round(BASE_POINTS * mult * (0.5 + accuracy))
}

/**
 * Live clear target: the quest's floor, raised toward what he has already
 * proved he can do, so difficulty tracks him instead of a fixed table.
 */
export function clearTarget(baseTarget: number, previousBest: number): number {
  return Math.max(baseTarget, Math.round((previousBest * 0.8) / 50) * 50)
}
