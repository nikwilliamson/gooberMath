import type { Fact, FactKey, Op } from './types'

/** A pair spec describes (a,b) operand pairs; the op turns them into facts. */
export type PairSpec =
  | { kind: 'addend'; values: number[]; maxSum: number; min?: number }
  | { kind: 'doubles'; max: number }
  | { kind: 'sumTo'; sum: number }
  /** Make-ten pairs plus the ten-plus facts: the bridging strategy, whole. */
  | { kind: 'makeTen' }
  | { kind: 'nearDoubles'; max: number }
  | { kind: 'allSums'; maxSum: number }
  | { kind: 'factor'; values: number[]; max: number }
  | { kind: 'squares'; max: number }
  | { kind: 'allProducts'; max: number }

export interface FactSpec {
  op: Op
  pairs: PairSpec
}

const pairKey = (a: number, b: number) => `${Math.min(a, b)}:${Math.max(a, b)}`

/** Canonical, deduped, sorted operand pairs. Always a <= b. */
export function pairsFor(spec: PairSpec): Array<[number, number]> {
  const out = new Map<string, [number, number]>()
  const push = (a: number, b: number) => {
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    out.set(pairKey(lo, hi), [lo, hi])
  }

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
    case 'nearDoubles':
      for (let n = 1; n < spec.max; n++) push(n, n + 1)
      break
    case 'allSums':
      for (let a = 0; a <= 9; a++) {
        for (let b = a; b <= 9; b++) if (a + b <= spec.maxSum) push(a, b)
      }
      break
    case 'factor':
      for (const v of spec.values) {
        for (let o = 0; o <= 10 && v * o <= spec.max; o++) push(v, o)
      }
      break
    case 'squares':
      for (let n = 1; n <= spec.max; n++) push(n, n)
      break
    case 'allProducts':
      for (let a = 0; a <= 10; a++) {
        for (let b = a; b <= 10; b++) if (a * b <= spec.max) push(a, b)
      }
      break
  }

  return [...out.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1])
}

export const addFamily = (a: number, b: number): FactKey =>
  `add:${Math.min(a, b)}+${Math.max(a, b)}`
export const mulFamily = (a: number, b: number): FactKey =>
  `mul:${Math.min(a, b)}x${Math.max(a, b)}`

/**
 * Expand a spec into facts. Subtraction and division are derived from their
 * inverse pairs, which is why 8-3 and 8-5 both hang off add:3+5.
 */
export function factsFor(spec: FactSpec): Fact[] {
  const out = new Map<FactKey, Fact>()
  const add = (f: Fact) => out.set(f.key, f)

  for (const [a, b] of pairsFor(spec.pairs)) {
    switch (spec.op) {
      case 'add':
        add({ key: addFamily(a, b), op: 'add', a, b, answer: a + b, family: addFamily(a, b) })
        break
      case 'sub': {
        const sum = a + b
        add({ key: `sub:${sum}-${b}`, op: 'sub', a: sum, b, answer: a, family: addFamily(a, b) })
        add({ key: `sub:${sum}-${a}`, op: 'sub', a: sum, b: a, answer: b, family: addFamily(a, b) })
        break
      }
      case 'mul':
        add({ key: mulFamily(a, b), op: 'mul', a, b, answer: a * b, family: mulFamily(a, b) })
        break
      case 'div': {
        const prod = a * b
        if (b > 0) add({ key: `div:${prod}/${b}`, op: 'div', a: prod, b, answer: a, family: mulFamily(a, b) })
        if (a > 0) add({ key: `div:${prod}/${a}`, op: 'div', a: prod, b: a, answer: b, family: mulFamily(a, b) })
        break
      }
    }
  }

  return [...out.values()]
}

export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' }

export const formatFact = (f: Fact) => `${f.a} ${OP_SYMBOL[f.op]} ${f.b}`
