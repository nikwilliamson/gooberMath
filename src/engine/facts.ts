import type { Fact, FactKey, Op } from './types'

/**
 * A pair spec describes (a,b) operand pairs; the op turns them into facts.
 *
 * Pairs come out in the order each kind enumerates them, and on a gated quest
 * that is the order facts are introduced, so every kind enumerates the way
 * the strategy is taught: counting on, skip counting, and so on. Nothing here
 * sorts.
 */
export type PairSpec =
  /** Each value plus min..9, counting on. */
  | { kind: 'addend'; values: number[]; maxSum: number; min?: number }
  | { kind: 'doubles'; max: number }
  | { kind: 'sumTo'; sum: number }
  /** Make-ten pairs plus the ten-plus facts: the bridging strategy, whole. */
  | { kind: 'makeTen' }
  /** n + (n+1), and with span 2 also n + (n+2). */
  | { kind: 'nearDoubles'; max: number; span?: number }
  | { kind: 'allSums'; maxSum: number; min?: number }
  /** Each value times min..10, in skip-counting order. */
  | { kind: 'factor'; values: number[]; max: number; min?: number }
  | { kind: 'squares'; max: number; min?: number }
  | { kind: 'allProducts'; max: number; min?: number }

/**
 * Which inverse facts a subtraction or division quest takes from each pair.
 * "Take away 2" (7 − 2) and "take away to leave 2" (7 − 5) are different
 * strategies, so a quest can ask for just the side it teaches:
 * - 'both': 7 − 2 and 7 − 5 (the default).
 * - 'value': only sum − value, or product ÷ value, where the value is the
 *   first operand as the spec enumerates it (the addend or factor listed).
 */
export type Derive = 'both' | 'value'

export interface FactSpec {
  op: Op
  pairs: PairSpec
  /** sub/div only. */
  derive?: Derive
}

const pairKey = (a: number, b: number) => `${Math.min(a, b)}:${Math.max(a, b)}`

/**
 * Raw enumeration in teaching order, value first, duplicates allowed
 * (2 × 5 and 5 × 2 both come out of a factor spec for [2, 5]).
 */
function enumerate(spec: PairSpec): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const push = (v: number, o: number) => out.push([v, o])

  switch (spec.kind) {
    case 'addend': {
      const lo = spec.min ?? 0
      for (const v of spec.values) {
        for (let o = lo; o + v <= spec.maxSum && o <= 9; o++) push(v, o)
      }
      break
    }
    case 'doubles':
      for (let n = 1; n <= spec.max; n++) push(n, n)
      break
    case 'sumTo':
      // From 1, not 0: "0 + 10" is not a one-digit fact and teaches nothing.
      for (let a = 1; a <= spec.sum - a && spec.sum - a <= 9; a++) push(a, spec.sum - a)
      break
    case 'makeTen':
      for (let a = 1; a <= 5; a++) push(a, 10 - a)
      // Ten plus the rest: making ten is only useful if you can add onto it.
      for (let o = 1; o <= 9; o++) push(10, o)
      break
    case 'nearDoubles': {
      const span = spec.span ?? 1
      for (let d = 1; d <= span; d++) {
        for (let n = 1; n + d <= spec.max; n++) push(n, n + d)
      }
      break
    }
    case 'allSums': {
      const lo = spec.min ?? 0
      for (let a = lo; a <= 9; a++) {
        for (let b = a; b <= 9; b++) if (a + b <= spec.maxSum) push(a, b)
      }
      break
    }
    case 'factor': {
      const lo = spec.min ?? 1
      for (const v of spec.values) {
        for (let o = lo; o <= 10 && v * o <= spec.max; o++) push(v, o)
      }
      break
    }
    case 'squares':
      for (let n = spec.min ?? 1; n <= spec.max; n++) push(n, n)
      break
    case 'allProducts': {
      const lo = spec.min ?? 0
      for (let a = lo; a <= 10; a++) {
        for (let b = a; b <= 10; b++) if (a * b <= spec.max) push(a, b)
      }
      break
    }
  }

  return out
}

/** Canonical, deduped operand pairs in teaching order. Always a <= b. */
export function pairsFor(spec: PairSpec): Array<[number, number]> {
  const out = new Map<string, [number, number]>()
  for (const [a, b] of enumerate(spec)) {
    const k = pairKey(a, b)
    if (!out.has(k)) out.set(k, [Math.min(a, b), Math.max(a, b)])
  }
  return [...out.values()]
}

export const addFamily = (a: number, b: number): FactKey =>
  `add:${Math.min(a, b)}+${Math.max(a, b)}`
export const mulFamily = (a: number, b: number): FactKey =>
  `mul:${Math.min(a, b)}x${Math.max(a, b)}`

const subFact = (a: number, b: number): Fact =>
  ({ key: `sub:${a + b}-${b}`, op: 'sub', a: a + b, b, answer: a, family: addFamily(a, b) })
const divFact = (a: number, b: number): Fact =>
  ({ key: `div:${a * b}/${b}`, op: 'div', a: a * b, b, answer: a, family: mulFamily(a, b) })

/**
 * Expand a spec into facts, in teaching order. Subtraction and division are
 * derived from their inverse pairs, which is why 8-3 and 8-5 both hang off
 * add:3+5.
 */
export function factsFor(spec: FactSpec): Fact[] {
  const out = new Map<FactKey, Fact>()
  const add = (f: Fact) => {
    if (!out.has(f.key)) out.set(f.key, f)
  }

  if (spec.derive === 'value' && (spec.op === 'sub' || spec.op === 'div')) {
    // Raw enumeration, so 10 ÷ 2 and 10 ÷ 5 both survive for a [2, 5] spec.
    for (const [v, o] of enumerate(spec.pairs)) {
      if (spec.op === 'sub') add(subFact(o, v))
      else if (v > 0) add(divFact(o, v))
    }
    return [...out.values()]
  }

  for (const [a, b] of pairsFor(spec.pairs)) {
    switch (spec.op) {
      case 'add':
        add({ key: addFamily(a, b), op: 'add', a, b, answer: a + b, family: addFamily(a, b) })
        break
      case 'sub':
        add(subFact(a, b))
        add(subFact(b, a))
        break
      case 'mul':
        add({ key: mulFamily(a, b), op: 'mul', a, b, answer: a * b, family: mulFamily(a, b) })
        break
      case 'div':
        if (b > 0) add(divFact(a, b))
        if (a > 0) add(divFact(b, a))
        break
    }
  }

  return [...out.values()]
}

export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' }

export const formatFact = (f: Fact) => `${f.a} ${OP_SYMBOL[f.op]} ${f.b}`
