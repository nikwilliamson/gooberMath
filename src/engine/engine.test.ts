import { describe, expect, it } from 'vitest'
import { factsFor, formatFact, pairsFor } from './facts'
import { emptyStat, recordAnswer, statFor, tierOf } from './mastery'
import { QUESTS, questById } from './quests'
import { runReducer, startRun, summarize } from './run'
import { clearTarget, comboMult, scoreAnswer, speedBonus } from './scoring'
import { RETRY_MAX, createSelector, recordSelection, selectNext } from './selector'
import type { FactKey, StatsMap } from './types'

describe('facts', () => {
  it('canonicalises commutative pairs and skips the degenerate zero pair', () => {
    expect(pairsFor({ kind: 'sumTo', sum: 10 })).toEqual([[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]])
  })

  it('derives subtraction from its inverse family', () => {
    const facts = factsFor({ op: 'sub', pairs: { kind: 'doubles', max: 3 } })
    const keys = facts.map((f) => f.key).sort()
    expect(keys).toEqual(['sub:2-1', 'sub:4-2', 'sub:6-3'])
    expect(facts.every((f) => f.family.startsWith('add:'))).toBe(true)
    expect(facts.every((f) => f.a - f.b === f.answer)).toBe(true)
  })

  it('derives division and never divides by zero', () => {
    const facts = factsFor({ op: 'div', pairs: { kind: 'factor', values: [5], max: 100 } })
    expect(facts.every((f) => f.b > 0)).toBe(true)
    expect(facts.every((f) => f.a / f.b === f.answer)).toBe(true)
  })

  it('every quest produces solvable, whole-number facts', () => {
    for (const q of QUESTS) {
      const facts = factsFor(q.spec)
      for (const f of facts) {
        expect(Number.isInteger(f.answer), `${q.id} ${f.key}`).toBe(true)
        expect(f.answer, `${q.id} ${f.key}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('every quest has enough facts to fill a run', () => {
    // A 60s run is ~30 answers. Under about eight facts he is not practising a
    // set, he is repeating the same handful, which is what made "Ten Pact" (six
    // facts, two of them new) not work as a level.
    for (const q of QUESTS) {
      expect(factsFor(q.spec).length, q.id).toBeGreaterThanOrEqual(8)
    }
  })

  it('no quest contains a degenerate or out-of-range fact', () => {
    for (const q of QUESTS) {
      for (const f of factsFor(q.spec)) {
        // "0 + 10 = 10" is not a fact worth drilling.
        expect(f.op === 'add' && (f.a === 0 || f.b === 0) && f.answer > 9, `${q.id} ${f.key}`).toBe(false)
        expect(f.a, `${q.id} ${f.key}`).toBeLessThanOrEqual(100)
        expect(f.b, `${q.id} ${f.key}`).toBeLessThanOrEqual(10)
      }
    }
  })

  it('make ten covers the pairs to ten and the ten-plus facts', () => {
    const keys = factsFor({ op: 'add', pairs: { kind: 'makeTen' } }).map((f) => f.key)
    for (const k of ['add:1+9', 'add:2+8', 'add:3+7', 'add:4+6', 'add:5+5']) {
      expect(keys, k).toContain(k)
    }
    expect(keys).toContain('add:7+10')
    expect(keys).not.toContain('add:0+10')
    expect(keys).toHaveLength(14)
  })

  it('formats with real math symbols', () => {
    const [f] = factsFor({ op: 'mul', pairs: { kind: 'squares', max: 1 } })
    expect(formatFact(f)).toBe('1 × 1')
  })
})

describe('mastery', () => {
  it('needs accuracy and speed to reach automatic', () => {
    let s = emptyStat('add:3+5')
    for (let i = 0; i < 5; i++) s = recordAnswer(s, true, 900, i)
    expect(tierOf(s)).toBe('automatic')

    let slow = emptyStat('add:3+5')
    for (let i = 0; i < 5; i++) slow = recordAnswer(slow, true, 2500, i)
    expect(tierOf(slow)).toBe('known')

    let sloppy = emptyStat('add:3+5')
    for (let i = 0; i < 5; i++) sloppy = recordAnswer(sloppy, i > 1, 900, i)
    expect(tierOf(sloppy)).toBe('learning')
  })

  it('ignores the latency of wrong answers', () => {
    let s = recordAnswer(emptyStat('k'), true, 800, 0)
    s = recordAnswer(s, false, 9000, 1)
    expect(s.ewmaMs).toBe(800)
    expect(s.streak).toBe(0)
  })
})

describe('selector', () => {
  const quest = questById('add-boss')!
  const facts = factsFor(quest.spec)

  it('never serves the same fact twice in a row', () => {
    let sel = createSelector(facts, {}, false, 42)
    let last: FactKey | null = null
    for (let i = 0; i < 400; i++) {
      const r = selectNext(sel, facts, {})
      expect(r.key).not.toBe(last)
      last = r.key
      sel = r.sel
    }
  })

  it('brings a missed fact back within five problems', () => {
    let sel = createSelector(facts, {}, false, 7)
    const first = selectNext(sel, facts, {})
    sel = recordSelection(first.sel, first.key, false)

    let sawAt = -1
    for (let i = 0; i < RETRY_MAX + 1; i++) {
      const r = selectNext(sel, facts, {})
      sel = r.sel
      if (r.key === first.key) {
        sawAt = i
        break
      }
    }
    expect(sawAt).toBeGreaterThanOrEqual(0)
    expect(sawAt).toBeLessThanOrEqual(RETRY_MAX)
  })

  it('introduces new facts one at a time on gated quests', () => {
    const mul = questById('mul-1')!
    const mulFacts = factsFor(mul.spec)
    let sel = createSelector(mulFacts, {}, true, 3)
    expect(sel.active.length).toBeLessThanOrEqual(4)

    // Master everything currently active; exactly one new fact should join.
    const stats: StatsMap = {}
    for (const k of sel.active) {
      let s = emptyStat(k)
      for (let i = 0; i < 4; i++) s = recordAnswer(s, true, 800, i)
      stats[k] = s
    }
    const before = sel.active.length
    sel = selectNext(sel, mulFacts, stats).sel
    expect(sel.active.length).toBe(before + 1)
  })

  it('keeps a simulated player inside the flow band', () => {
    // Deterministic fake player: owns 80% of the facts, shaky on the rest.
    // Below ~85% a run stops feeling winnable; above ~97% he is not learning.
    let t = 123456789
    const rand = () => ((t = (t * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    const owned = new Set(facts.filter((_, i) => i % 5 !== 0).map((f) => f.key))
    const stats: StatsMap = {}
    let sel = createSelector(facts, stats, false, 11)
    let hits = 0
    const N = 600

    for (let i = 0; i < N; i++) {
      const r = selectNext(sel, facts, stats)
      sel = r.sel
      const correct = owned.has(r.key) ? rand() < 0.97 : rand() < 0.55
      if (correct) hits++
      stats[r.key] = recordAnswer(statFor(stats, r.key), correct, correct ? 1200 : 3500, i)
      sel = recordSelection(sel, r.key, correct)
    }
    const rate = hits / N
    expect(rate).toBeGreaterThan(0.85)
    expect(rate).toBeLessThan(0.98)
  })
})

describe('scoring', () => {
  it('steps the combo multiplier', () => {
    expect(comboMult(0)).toBe(1)
    expect(comboMult(5)).toBe(1.5)
    expect(comboMult(10)).toBe(2)
    expect(comboMult(25)).toBe(3)
  })

  it('pays speed in blitz and accuracy in sniper', () => {
    expect(speedBonus(0)).toBe(100)
    expect(speedBonus(3000)).toBe(0)
    expect(scoreAnswer({ mode: 'blitz', ms: 0, streak: 0, accuracy: 0.5 })).toBe(200)
    expect(scoreAnswer({ mode: 'sniper', ms: 0, streak: 0, accuracy: 1 })).toBe(150)
    expect(scoreAnswer({ mode: 'sniper', ms: 0, streak: 0, accuracy: 0.5 })).toBe(100)
  })

  it('raises the clear target toward his own best', () => {
    expect(clearTarget(2500, 0)).toBe(2500)
    expect(clearTarget(2500, 6000)).toBe(4800)
  })
})

describe('run loop', () => {
  const quest = questById('add-1')!

  const answer = (state: ReturnType<typeof startRun>['state'], ctx: ReturnType<typeof startRun>['ctx'], t: number, correct: boolean) => {
    const fact = ctx.byKey.get(state.currentKey)!
    const value = correct ? fact.answer : fact.answer + 1
    let s = state
    for (const ch of String(value)) s = runReducer(s, { type: 'DIGIT', d: Number(ch), now: t }, ctx)
    return s
  }

  it('auto-submits on digit count and never on a partial answer', () => {
    const { state, ctx } = startRun(quest, {}, { mode: 'blitz', untimed: false, seed: 5 }, 0)
    const fact = ctx.byKey.get(state.currentKey)!
    if (String(fact.answer).length === 2) {
      const s1 = runReducer(state, { type: 'DIGIT', d: 1, now: 100 }, ctx)
      expect(s1.phase).toBe('playing')
      expect(s1.entry).toBe('1')
    }
    const done = answer(state, ctx, 500, true)
    expect(done.phase).toBe('feedback')
    expect(done.lastCorrect).toBe(true)
  })

  it('pauses the clock through a wrong-answer reveal and charges the sniper penalty', () => {
    const { state, ctx } = startRun(quest, {}, { mode: 'sniper', untimed: false, seed: 9 }, 0)
    const s = answer(state, ctx, 800, false)
    expect(s.lastCorrect).toBe(false)
    expect(s.clockRunning).toBe(false)
    expect(s.msLeft).toBe(60_000 - 3000)
    expect(s.streak).toBe(0)
  })

  it('costs no clock in blitz', () => {
    const { state, ctx } = startRun(quest, {}, { mode: 'blitz', untimed: false, seed: 9 }, 0)
    const s = answer(state, ctx, 800, false)
    expect(s.msLeft).toBe(60_000)
  })

  it('resolves a stalled half-typed answer instead of jamming', () => {
    const { state, ctx } = startRun(quest, {}, { mode: 'blitz', untimed: false, seed: 2 }, 0)
    const fact = ctx.byKey.get(state.currentKey)!
    if (String(fact.answer).length < 2) return
    let s = runReducer(state, { type: 'DIGIT', d: 9, now: 100 }, ctx)
    expect(s.phase).toBe('playing')
    s = runReducer(s, { type: 'TICK', now: 4000 }, ctx)
    expect(s.phase === 'feedback' || s.phase === 'playing').toBe(true)
    expect(s.entry === '' || s.lastCorrect !== null).toBe(true)
  })

  it('ends when the clock runs out and reports a summary', () => {
    const { state, ctx } = startRun(quest, {}, { mode: 'blitz', untimed: false, seed: 4 }, 0)
    let s = answer(state, ctx, 900, true)
    s = runReducer(s, { type: 'TICK', now: 61_000 }, ctx)
    expect(s.phase).toBe('over')
    const sum = summarize(s)
    expect(sum.correct).toBe(1)
    expect(sum.accuracy).toBe(1)
    expect(sum.perfect).toBe(true)
    expect(sum.score).toBeGreaterThan(0)
  })

  it('a wrong answer does not end the run', () => {
    const { state, ctx } = startRun(quest, {}, { mode: 'sniper', untimed: false, seed: 6 }, 0)
    let s = answer(state, ctx, 900, false)
    s = runReducer(s, { type: 'TICK', now: 2000 }, ctx)
    expect(s.phase).not.toBe('over')
  })
})
