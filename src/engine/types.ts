export type Op = 'add' | 'sub' | 'mul' | 'div'
export type Mode = 'blitz' | 'sniper'
export type FactKey = string
export type Tier = 'new' | 'learning' | 'known' | 'automatic'

export interface Fact {
  /** Canonical identity, e.g. "add:3+5", "sub:8-3", "mul:4x6", "div:24/6". */
  key: FactKey
  op: Op
  a: number
  b: number
  answer: number
  /** The add/mul atom this fact belongs to, so 8-3 and 3+5 share a family. */
  family: FactKey
}

export interface FactStat {
  key: FactKey
  seen: number
  correct: number
  streak: number
  /** Exponentially weighted mean latency of CORRECT answers, ms. 0 = no data. */
  ewmaMs: number
  lastSeenAt: number
}

export type StatsMap = Record<FactKey, FactStat>

export type Input = 'keys' | 'voice'

export interface AnswerLog {
  key: FactKey
  correct: boolean
  ms: number
  points: number
  /** How this one was answered. The keypad stays live in a voice run. */
  input: Input
}
