import { describe, expect, it } from 'vitest'
import { factsFor, formatFact, pairsFor } from './facts'
import { emptyStat, learnedRatio, recordAnswer, statFor, tierOf } from './mastery'
import { DEFAULT_CLEAR_RATIO, QUESTS, questById, questsIn } from './quests'
import { IDLE_MS, runReducer, startRun, summarize } from './run'
import { UNLOCK_SCORE, comboMult, scoreAnswer, speedBonus } from './scoring'
import { INTRO_GAP, INTRO_SCHEDULE, MAX_LEARNING, RETRY_MAX, SEED_POOL, createSelector, recordSelection, selectNext } from './selector'
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

  it('keeps zero and one out of multiply and divide, and off every front door', () => {
    for (const q of QUESTS) {
      if (q.region === 'mul' || q.region === 'div') {
        for (const f of factsFor(q.spec)) {
          expect(f.a, `${q.id} ${f.key}`).toBeGreaterThanOrEqual(2)
          expect(f.b, `${q.id} ${f.key}`).toBeGreaterThanOrEqual(2)
        }
      }
    }
    // The first fact of each region's first quest is the first problem that
    // region can ever show him. It must be worth having.
    for (const r of ['add', 'sub', 'mul', 'div'] as const) {
      const [first] = factsFor(questsIn(r)[0].spec)
      expect(first.a, r).toBeGreaterThanOrEqual(1)
      expect(first.b, r).toBeGreaterThanOrEqual(1)
      expect(first.answer, r).toBeGreaterThanOrEqual(1)
    }
  })

  it('enumerates in teaching order, not canonical order', () => {
    const twos = factsFor({ op: 'mul', pairs: { kind: 'factor', values: [2, 5], max: 100, min: 2 } })
    expect(twos.slice(0, 3).map(formatFact)).toEqual(['2 × 2', '2 × 3', '2 × 4'])
    // Fives start once the twos are done, and 2 × 5 is not repeated.
    expect(twos.map((f) => f.key).filter((k) => k === 'mul:2x5')).toHaveLength(1)
    const [firstAdd] = factsFor(questById('add-1')!.spec)
    expect(formatFact(firstAdd)).toBe('1 + 1')
  })

  it("derives only the strategy's side of a family when asked", () => {
    for (const f of factsFor(questById('sub-1')!.spec)) expect([1, 2], f.key).toContain(f.b)
    for (const f of factsFor(questById('sub-5')!.spec)) expect([8, 9], f.key).toContain(f.b)
    for (const f of factsFor(questById('div-1')!.spec)) expect([2, 5, 10], f.key).toContain(f.b)
    // 10 ÷ 2 and 10 ÷ 5 both survive even though they share a pair.
    const keys = factsFor(questById('div-1')!.spec).map((f) => f.key)
    expect(keys).toContain('div:10/2')
    expect(keys).toContain('div:10/5')
  })

  it('mirrors the Coast in the Marsh, quest for quest', () => {
    expect(questsIn('sub')).toHaveLength(questsIn('add').length)
  })

  it('bosses are review, not a pile of new facts', () => {
    const unseenInBoss = (region: 'add' | 'sub' | 'mul') => {
      const pre = new Set(questsIn(region).filter((q) => !q.boss).flatMap((q) => factsFor(q.spec).map((f) => f.key)))
      const boss = questsIn(region).find((q) => q.boss)!
      const facts = factsFor(boss.spec)
      return facts.filter((f) => !pre.has(f.key)).length / facts.length
    }
    expect(unseenInBoss('add')).toBeLessThan(0.1)
    expect(unseenInBoss('sub')).toBeLessThan(0.25)
    // The Peaks boss is exactly the six facts no strategy covers, in review.
    const pre = new Set(questsIn('mul').filter((q) => !q.boss).flatMap((q) => factsFor(q.spec).map((f) => f.key)))
    const fresh = factsFor(questById('mul-boss')!.spec).filter((f) => !pre.has(f.key)).map((f) => f.key)
    expect(fresh).toEqual(['mul:6x7', 'mul:6x8', 'mul:6x9', 'mul:7x8', 'mul:7x9', 'mul:8x9'])
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

  /** Perfect player: answers every problem correctly in `ms`. */
  const play = (questId: string, n: number, stats: StatsMap = {}, ms = 2000, seed = 3) => {
    const q = questById(questId)!
    const qFacts = factsFor(q.spec)
    let sel = createSelector(qFacts, stats, q.untimedFirst, seed)
    const served: FactKey[] = []
    for (let i = 0; i < n; i++) {
      const r = selectNext(sel, qFacts, stats)
      sel = r.sel
      served.push(r.key)
      stats[r.key] = recordAnswer(statFor(stats, r.key), true, ms, i)
      sel = recordSelection(sel, r.key, true)
    }
    return { served, sel }
  }

  const mastered = (questIds: string[], ms = 2000) => {
    const stats: StatsMap = {}
    for (const id of questIds) {
      for (const f of factsFor(questById(id)!.spec)) {
        let st = emptyStat(f.key)
        for (let i = 0; i < 4; i++) st = recordAnswer(st, true, ms, i)
        stats[f.key] = st
      }
    }
    return stats
  }

  it('introduces one new fact per INTRO_GAP on gated quests, and stops at MAX_LEARNING', () => {
    const mul = questById('mul-1')!
    const mulFacts = factsFor(mul.spec)
    let sel = createSelector(mulFacts, {}, true, 3)
    expect(sel.active.length).toBe(SEED_POOL)

    // Master the seeds but never answer anything introduced after them.
    const stats = mastered([])
    for (const k of sel.active) {
      let s = emptyStat(k)
      for (let i = 0; i < 4; i++) s = recordAnswer(s, true, 800, i)
      stats[k] = s
    }
    const sizes: number[] = []
    for (let i = 0; i < INTRO_GAP * 4; i++) {
      sel = selectNext(sel, mulFacts, stats).sel
      sizes.push(sel.active.length)
    }
    expect(sizes[INTRO_GAP - 1]).toBe(SEED_POOL)
    expect(sizes[INTRO_GAP]).toBe(SEED_POOL + 1)
    expect(sizes[INTRO_GAP * 2]).toBe(SEED_POOL + 2)
    // Two unlearned facts in the pool: no third.
    expect(sizes[INTRO_GAP * 4 - 1]).toBe(SEED_POOL + MAX_LEARNING)
  })

  it('rehearses a new fact on the expanding schedule before it fades into the pool', () => {
    const { served } = play('mul-1', 12)
    // A warm-up is 12 problems: exactly the seeds, in teaching order, each
    // seen at least INTRO_SCHEDULE.length times.
    const seeds = factsFor(questById('mul-1')!.spec).slice(0, SEED_POOL).map((f) => f.key)
    expect([...new Set(served)].sort()).toEqual([...seeds].sort())
    for (const k of seeds) {
      expect(served.filter((s) => s === k).length, k).toBeGreaterThanOrEqual(INTRO_SCHEDULE.length)
    }
    expect(served[0]).toBe('mul:2x2')
  })

  it('surfaces a fresh gated quest within a handful of runs, not thirty', () => {
    // ~20 problems is one 60s run. The old selector had 13 of 30 facts active
    // after 200 perfect answers.
    const { sel } = play('mul-1', 60)
    expect(sel.active.length).toBeGreaterThanOrEqual(12)
    const all = play('mul-1', 200)
    expect(all.sel.active.length).toBe(factsFor(questById('mul-1')!.spec).length)
  })

  it('leads a boss with its own facts even when review fills the seed pool', () => {
    const stats = mastered(['mul-1', 'mul-2', 'mul-3'])
    const { served } = play('mul-boss', 30, stats)
    expect(served[0]).toBe('mul:6x7')
    const hard = ['mul:6x7', 'mul:6x8', 'mul:6x9', 'mul:7x8', 'mul:7x9', 'mul:8x9']
    expect(hard.filter((k) => served.includes(k)).length).toBe(hard.length)
  })

  it('still seeds new facts when every review fact is slow', () => {
    // Every prior fact over the 3s bar: 'learning', which used to block all
    // introductions and made the boss a pure review quest.
    const stats = mastered(['mul-1', 'mul-2', 'mul-3'], 3200)
    const { served } = play('mul-boss', 10, stats)
    expect(served).toContain('mul:6x7')
    expect(served).toContain('mul:6x8')
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

  it('a score never changes what any quest requires', () => {
    // The old rule set the next quest's target to 80% of the best score on the
    // previous one, so a good run raised a later bar. Clearing now depends only
    // on the facts of the quest itself.
    const quest = questById('add-2')!
    const keys = factsFor(quest.spec).map((f) => f.key)
    const stats: StatsMap = {}
    for (const k of keys) {
      let st = emptyStat(k)
      for (let i = 0; i < 4; i++) st = recordAnswer(st, true, 1000, i)
      stats[k] = st
    }
    expect(learnedRatio(stats, keys)).toBe(1)
    // Same facts, same verdict, whatever happened on any other quest.
    expect(learnedRatio(stats, keys) >= DEFAULT_CLEAR_RATIO).toBe(true)
  })

  it('does not count a fact as learned while it is slow or shaky', () => {
    const keys = ['a', 'b', 'c', 'd']
    const stats: StatsMap = {}
    let fast = emptyStat('a')
    for (let i = 0; i < 4; i++) fast = recordAnswer(fast, true, 900, i)
    stats.a = fast
    let slow = emptyStat('b')
    for (let i = 0; i < 4; i++) slow = recordAnswer(slow, true, 4200, i)   // over the 3s bar
    stats.b = slow
    let shaky = emptyStat('c')
    for (let i = 0; i < 6; i++) shaky = recordAnswer(shaky, i % 2 === 0, 900, i)
    stats.c = shaky
    // 'd' never seen at all.
    expect(learnedRatio(stats, keys)).toBe(0.25)
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

  it('does not mark a two-digit answer wrong after only the first digit', () => {
    // The reported bug: idle was measured from when the PROBLEM appeared, so
    // taking longer than IDLE_MS to start typing made the first digit of a
    // two-digit answer resolve instantly as a wrong answer.
    const boss = questById('add-boss')!
    const { state, ctx } = startRun(boss, {}, { mode: 'sniper', untimed: false, seed: 3 }, 0)

    // Walk to a problem that actually needs two digits.
    let s = state
    for (let i = 0; i < 40 && String(ctx.byKey.get(s.currentKey)!.answer).length < 2; i++) {
      const f = ctx.byKey.get(s.currentKey)!
      for (const ch of String(f.answer)) s = runReducer(s, { type: 'DIGIT', d: Number(ch), now: 100 }, ctx)
      s = runReducer(s, { type: 'RESOLVE', now: 200 }, ctx)
    }
    const fact = ctx.byKey.get(s.currentKey)!
    expect(String(fact.answer).length, 'needed a two-digit answer to test').toBe(2)

    const wrongBefore = s.wrongCount
    // He thinks for four seconds, then presses the first digit.
    s = runReducer(s, { type: 'TICK', now: 4000 }, ctx)
    s = runReducer(s, { type: 'DIGIT', d: Number(String(fact.answer)[0]), now: 4200 }, ctx)
    expect(s.entry).toBe(String(fact.answer)[0])
    // The next frame must not turn that single digit into a wrong answer.
    s = runReducer(s, { type: 'TICK', now: 4230 }, ctx)
    expect(s.wrongCount).toBe(wrongBefore)
    expect(s.phase).toBe('playing')

    // Finishing the answer still scores it correct.
    s = runReducer(s, { type: 'DIGIT', d: Number(String(fact.answer)[1]), now: 4400 }, ctx)
    expect(s.lastCorrect).toBe(true)
    expect(s.wrongCount).toBe(wrongBefore)
  })

  it('clears a stalled partial entry rather than scoring it', () => {
    const boss = questById('add-boss')!
    const { state, ctx } = startRun(boss, {}, { mode: 'sniper', untimed: false, seed: 8 }, 0)
    let s = state
    for (let i = 0; i < 40 && String(ctx.byKey.get(s.currentKey)!.answer).length < 2; i++) {
      const f = ctx.byKey.get(s.currentKey)!
      for (const ch of String(f.answer)) s = runReducer(s, { type: 'DIGIT', d: Number(ch), now: 100 }, ctx)
      s = runReducer(s, { type: 'RESOLVE', now: 200 }, ctx)
    }
    s = runReducer(s, { type: 'DIGIT', d: 1, now: 1000 }, ctx)
    expect(s.entry).toBe('1')
    const wrongBefore = s.wrongCount
    s = runReducer(s, { type: 'TICK', now: 1000 + IDLE_MS + 50 }, ctx)
    expect(s.entry).toBe('')
    expect(s.wrongCount).toBe(wrongBefore)
    expect(s.phase).toBe('playing')
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

describe('unlocking', () => {
  const quest = questById('add-3')!

  /** A full 60s sniper run: one answer every `gapMs`, missing one in `missEvery`. */
  const playRun = (gapMs: number, missEvery: number, seed: number) => {
    const { state, ctx } = startRun(quest, {}, { mode: 'sniper', untimed: false, seed }, 0)
    let s = state
    let n = 0
    for (let t = gapMs; t < 60_000 && s.phase !== 'over'; t += gapMs) {
      const fact = ctx.byKey.get(s.currentKey)!
      const value = missEvery > 0 && n % missEvery === 0 ? fact.answer + 1 : fact.answer
      for (const ch of String(value)) s = runReducer(s, { type: 'DIGIT', d: Number(ch), now: t }, ctx)
      // A miss waits for a tap now, so the simulated player taps through it.
      if (s.phase === 'feedback' && s.lastCorrect === false) {
        s = runReducer(s, { type: 'RESOLVE', now: t + 400 }, ctx)
      }
      s = runReducer(s, { type: 'TICK', now: t + gapMs / 2 }, ctx)
      n += 1
    }
    return summarize(runReducer(s, { type: 'TICK', now: 61_000 }, ctx))
  }

  it('is passable on a first careful run', () => {
    // A slow-but-careful pace, which is exactly the player this game is for.
    // If this fails, the gate is stalling his progress rather than pacing it.
    expect(playRun(3500, 20, 11).score).toBeGreaterThanOrEqual(UNLOCK_SCORE)
    expect(playRun(3000, 12, 3).score).toBeGreaterThanOrEqual(UNLOCK_SCORE)
  })

  it('is not passable by mashing through a run', () => {
    expect(playRun(4000, 3, 12).score).toBeLessThan(UNLOCK_SCORE)
  })

  it('holds a wrong answer on screen, clock stopped, until it is dismissed', () => {
    const { state, ctx } = startRun(quest, {}, { mode: 'sniper', untimed: false, seed: 9 }, 0)
    const fact = ctx.byKey.get(state.currentKey)!
    let s = state
    for (const ch of String(fact.answer + 1)) s = runReducer(s, { type: 'DIGIT', d: Number(ch), now: 800 }, ctx)
    expect(s.phase).toBe('feedback')
    expect(s.clockRunning).toBe(false)

    const before = s.msLeft
    s = runReducer(s, { type: 'TICK', now: 30_000 }, ctx)
    expect(s.phase).toBe('feedback')
    expect(s.msLeft).toBe(before)

    s = runReducer(s, { type: 'RESOLVE', now: 30_100 }, ctx)
    expect(s.phase).toBe('playing')
    expect(s.clockRunning).toBe(true)
  })

  it('never depends on another quest, so a big score cannot raise a later bar', () => {
    for (const q of QUESTS) expect(q.unlockScore ?? UNLOCK_SCORE).toBe(UNLOCK_SCORE)
  })
})
