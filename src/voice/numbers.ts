/**
 * Spoken numbers, 0–100: the whole vocabulary the recognizer is allowed to hear.
 *
 * Restricting Vosk to these words is what makes kid speech usable at all. With
 * the full English vocabulary a clean "seven" came back as "sam"; with this
 * list it is "seven", and "four" and "forty" stay apart.
 */

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
const TEENS = [
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
] as const
const TENS = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'] as const
const HUNDRED = 'hundred'

const VALUE = new Map<string, number>([
  ...UNITS.map((w, i) => [w, i] as const),
  ...TEENS.map((w, i) => [w, 10 + i] as const),
  ...TENS.map((w, i) => [w, 20 + i * 10] as const),
  [HUNDRED, 100],
])

/** Every word the grammar allows. Order does not matter to Vosk. */
export const NUMBER_WORDS: readonly string[] = [...VALUE.keys()]

export const isNumberWord = (w: string) => VALUE.has(w)

/**
 * The grammar handed to the recognizer. Words are listed individually, not as
 * phrases: Vosk accepts any sequence of them, which is what lets "twenty one"
 * and "six seven eight" through (verified against the real decoder).
 *
 * `[unk]` is added only when the model has it. Without it in the vocabulary
 * Vosk logs a warning and drops it, so offering it blindly is harmless but
 * misleading; the fetch script records whether the model has one.
 */
export const grammarFor = (hasUnk: boolean) => (hasUnk ? [...NUMBER_WORDS, '[unk]'] : [...NUMBER_WORDS])

const isTens = (n: number) => n >= 20 && n <= 90 && n % 10 === 0
const isDigit = (n: number) => n >= 1 && n <= 9

export interface SpokenNumber<W> {
  value: number
  /** The words that made it, in order. */
  words: W[]
}

/**
 * Fold a run of number words into the numbers a child means.
 *
 *   "twenty one"        → [21]
 *   "six seven eight"   → [6, 7, 8]    (counting on)
 *   "one hundred"       → [100]
 *   "twenty zero"       → [20, 0]      (nobody says 20 that way; keep both)
 */
export function parseNumbers<W extends { word: string }>(words: readonly W[]): SpokenNumber<W>[] {
  const out: SpokenNumber<W>[] = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const v = VALUE.get(w.word)
    if (v === undefined) continue

    const next = words[i + 1]
    const nv = next ? VALUE.get(next.word) : undefined

    if (isTens(v) && nv !== undefined && isDigit(nv)) {
      out.push({ value: v + nv, words: [w, next] })
      i++
      continue
    }
    if (v === 1 && nv === 100) {
      out.push({ value: 100, words: [w, next] })
      i++
      continue
    }
    out.push({ value: v, words: [w] })
  }
  return out
}
