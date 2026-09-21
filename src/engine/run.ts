import { factsFor } from './facts'
import { recordAnswer, statFor } from './mastery'
import type { QuestDef } from './quests'
import { RUN_MS, WRONG_PENALTY_MS, scoreAnswer } from './scoring'
import { createSelector, recordSelection, selectNext, type SelectorState } from './selector'
import type { AnswerLog, Fact, FactKey, Input, Mode, StatsMap } from './types'

export const FEEDBACK_CORRECT_MS = 200
/**
 * A wrong answer does not time out. The problem and its answer stay on screen,
 * clock paused, until he taps to move on — reading it is the whole point, and
 * a 900ms window was gone before he had finished looking.
 */
export const FEEDBACK_WRONG_MS = Infinity
/**
 * A half-typed answer that sits this long is CLEARED, so input never jams.
 * It is deliberately not scored: inventing a wrong answer out of a partial
 * entry punishes hesitation, which is the opposite of the point.
 */
export const IDLE_MS = 3000
export const PRACTICE_PROBLEMS = 12

export interface RunCtx {
  facts: Fact[]
  byKey: Map<FactKey, Fact>
}

export interface RunConfig {
  mode: Mode
  untimed: boolean
  /** Voice answering is on for this run. Bests are kept separately. */
  voice?: boolean
  seed?: number
}

export interface RunState {
  mode: Mode
  untimed: boolean
  voice: boolean
  questId: string
  sel: SelectorState
  stats: StatsMap
  currentKey: FactKey
  entry: string
  phase: 'playing' | 'feedback' | 'over'
  lastCorrect: boolean | null
  msLeft: number
  clockRunning: boolean
  shownAt: number
  /** When he last pressed a key, which is what the idle timeout measures from. */
  lastInputAt: number
  lastTickAt: number
  feedbackUntil: number
  score: number
  streak: number
  bestStreak: number
  correctCount: number
  wrongCount: number
  answers: AnswerLog[]
  /** Timestamp of the last clock penalty, so the UI can flash it. */
  penaltyAt: number
  problemsLeft: number
  startedAt: number
}

export type RunEvent =
  | { type: 'TICK'; now: number }
  | { type: 'DIGIT'; d: number; now: number }
  /**
   * A whole answer, heard. `spokeAt` is when he started saying it: the answer
   * time is measured from there, not from when the recognizer decided, so the
   * ~0.5s it waits to be sure he has finished is never charged to him — the
   * mastery tiers run on these latencies.
   */
  | { type: 'SPOKEN'; value: number; now: number; spokeAt: number }
  | { type: 'BACKSPACE' }
  | { type: 'RESOLVE'; now: number }
  | { type: 'QUIT' }

export const buildCtx = (quest: QuestDef): RunCtx => {
  const facts = factsFor(quest.spec)
  return { facts, byKey: new Map(facts.map((f) => [f.key, f])) }
}

export const digitsOf = (n: number) => String(n).length

export function startRun(quest: QuestDef, stats: StatsMap, cfg: RunConfig, now: number): {
  state: RunState
  ctx: RunCtx
} {
  const ctx = buildCtx(quest)
  const sel0 = createSelector(ctx.facts, stats, quest.untimedFirst, cfg.seed ?? Math.floor(Math.random() * 1e9))
  const { key, sel } = selectNext(sel0, ctx.facts, stats)
  return {
    ctx,
    state: {
      mode: cfg.mode,
      untimed: cfg.untimed,
      voice: cfg.voice ?? false,
      questId: quest.id,
      sel,
      stats,
      currentKey: key,
      entry: '',
      phase: 'playing',
      lastCorrect: null,
      msLeft: cfg.untimed ? Infinity : RUN_MS,
      clockRunning: true,
      shownAt: now,
      lastInputAt: now,
      lastTickAt: now,
      feedbackUntil: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctCount: 0,
      wrongCount: 0,
      answers: [],
      penaltyAt: 0,
      problemsLeft: cfg.untimed ? PRACTICE_PROBLEMS : Infinity,
      startedAt: now,
    },
  }
}

function resolveAnswer(
  s: RunState,
  ctx: RunCtx,
  now: number,
  value: string,
  input: Input = 'keys',
  answeredAt = now,
): RunState {
  const fact = ctx.byKey.get(s.currentKey)!
  const ms = Math.max(0, answeredAt - s.shownAt)
  const correct = value !== '' && Number(value) === fact.answer

  const correctCount = s.correctCount + (correct ? 1 : 0)
  const wrongCount = s.wrongCount + (correct ? 0 : 1)
  const accuracy = correctCount / (correctCount + wrongCount)
  const points = correct ? scoreAnswer({ mode: s.mode, ms, streak: s.streak, accuracy }) : 0

  const streak = correct ? s.streak + 1 : 0
  const penalty = !correct && s.mode === 'sniper' && !s.untimed ? WRONG_PENALTY_MS : 0

  const log: AnswerLog = { key: fact.key, correct, ms, points, input }

  return {
    ...s,
    stats: { ...s.stats, [fact.key]: recordAnswer(statFor(s.stats, fact.key), correct, ms, now) },
    sel: recordSelection(s.sel, fact.key, correct),
    entry: value,
    phase: 'feedback',
    lastCorrect: correct,
    // The reveal is instructional, so the clock waits through it; the penalty is the cost.
    clockRunning: correct,
    feedbackUntil: correct ? now + FEEDBACK_CORRECT_MS : FEEDBACK_WRONG_MS,
    score: s.score + points,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    correctCount,
    wrongCount,
    answers: [...s.answers, log],
    msLeft: Math.max(0, s.msLeft - penalty),
    penaltyAt: penalty > 0 ? now : s.penaltyAt,
    problemsLeft: s.problemsLeft - 1,
  }
}

export function runReducer(s: RunState, e: RunEvent, ctx: RunCtx): RunState {
  if (s.phase === 'over' && e.type !== 'QUIT') return s

  switch (e.type) {
    case 'TICK': {
      const dt = Math.max(0, e.now - s.lastTickAt)
      const msLeft = s.clockRunning && !s.untimed ? Math.max(0, s.msLeft - dt) : s.msLeft
      let next: RunState = { ...s, msLeft, lastTickAt: e.now }

      // A half-typed answer that stalls is CLEARED, not scored, and the idle
      // window runs from the last keypress. Measuring it from when the problem
      // appeared marked a two-digit answer wrong the instant the first digit
      // was pressed, whenever he had taken more than IDLE_MS to start typing —
      // which is exactly the player this game is for.
      if (next.phase === 'playing' && next.entry !== '' && e.now - next.lastInputAt > IDLE_MS) {
        next = { ...next, entry: '' }
      }
      if (next.phase === 'feedback' && e.now >= next.feedbackUntil) {
        next = runReducer(next, { type: 'RESOLVE', now: e.now }, ctx)
      }
      if (msLeft <= 0 && !next.untimed && next.phase !== 'over') {
        return { ...next, phase: 'over', clockRunning: false }
      }
      return next
    }

    case 'DIGIT': {
      if (s.phase !== 'playing') return s
      const fact = ctx.byKey.get(s.currentKey)!
      const width = digitsOf(fact.answer)
      if (s.entry.length >= width) return s
      const entry = s.entry + String(e.d)
      // Auto-submit on digit count: no Enter key for a second grader to find.
      if (entry.length === width) return resolveAnswer(s, ctx, e.now, entry)
      return { ...s, entry, lastInputAt: e.now }
    }

    case 'SPOKEN': {
      if (s.phase !== 'playing') return s
      // Whatever he had half-typed is superseded by what he said.
      return resolveAnswer(s, ctx, e.now, String(e.value), 'voice', e.spokeAt)
    }

    case 'BACKSPACE':
      return s.phase === 'playing' ? { ...s, entry: s.entry.slice(0, -1) } : s

    case 'RESOLVE': {
      if (s.phase !== 'feedback') return s
      const done = (!s.untimed && s.msLeft <= 0) || (s.untimed && s.problemsLeft <= 0)
      if (done) return { ...s, phase: 'over', clockRunning: false }
      const { key, sel } = selectNext(s.sel, ctx.facts, s.stats)
      return {
        ...s,
        sel,
        currentKey: key,
        entry: '',
        phase: 'playing',
        lastCorrect: null,
        clockRunning: true,
        shownAt: e.now,
        lastInputAt: e.now,
        lastTickAt: e.now,
      }
    }

    case 'QUIT':
      return { ...s, phase: 'over', clockRunning: false }
  }
}

export interface RunSummary {
  questId: string
  mode: Mode
  untimed: boolean
  voice: boolean
  score: number
  correct: number
  wrong: number
  accuracy: number
  bestStreak: number
  /** Answers per minute of clock actually played. */
  pace: number
  fastestMs: number | null
  avgMs: number | null
  perfect: boolean
  answers: AnswerLog[]
}

export function summarize(s: RunState): RunSummary {
  const total = s.correctCount + s.wrongCount
  const correctMs = s.answers.filter((a) => a.correct).map((a) => a.ms)
  const elapsedMin = s.untimed ? Math.max(1 / 60, (Date.now() - s.startedAt) / 60000) : 1
  return {
    questId: s.questId,
    mode: s.mode,
    untimed: s.untimed,
    voice: s.voice,
    score: s.score,
    correct: s.correctCount,
    wrong: s.wrongCount,
    accuracy: total === 0 ? 0 : s.correctCount / total,
    bestStreak: s.bestStreak,
    pace: Math.round(s.correctCount / elapsedMin),
    fastestMs: correctMs.length ? Math.min(...correctMs) : null,
    avgMs: correctMs.length ? Math.round(correctMs.reduce((a, b) => a + b, 0) / correctMs.length) : null,
    perfect: total > 0 && s.wrongCount === 0,
    answers: s.answers,
  }
}
