import { isNumberWord, parseNumbers, type SpokenNumber } from './numbers'

/**
 * When a heard number becomes his answer. Pure, like the run reducer: the
 * listener feeds it recognizer results, the run screen feeds it problems and
 * ticks, and whatever comes out goes to the engine.
 *
 * Fast when he is right, patient when he is wrong:
 * - A correct number is accepted the moment its final result arrives.
 * - A wrong number is HELD until he goes quiet. Anything he says meanwhile
 *   replaces it, so counting on with pauses ("six … seven … eight") lands on
 *   eight rather than being marked wrong at six, and a paused "twenty … four"
 *   is read as twenty-four. A fixed hold could not do this: the next word's
 *   final lands (pause + word + ~0.5s endpoint) after the last one, which
 *   outran a 1s hold at an ordinary half-second pause.
 * - A number the recognizer is unsure of is never scored.
 *
 * It acts on FINAL results only. Measured against the real decoder, grammar
 * mode's partials lag the audio badly — "six seven eight" stayed "six" for
 * every partial — so a partial never holds the answer before the final does.
 */

/** Nobody reads a problem and starts answering faster. Also covers the hit
    sound from the previous answer bleeding into the mic. */
export const REACTION_FLOOR_MS = 250
/** Clicks and speaker bleed are shorter than any spoken number. */
export const MIN_WORD_MS = 120
/** A WRONG number needs at least this confidence to be scored; below it he
    is asked to say it again. A guess never costs him. */
export const MIN_CONF = 0.6
/**
 * A number that IS the answer needs only this. Measured on the real decoder,
 * correctly heard teens come back at 0.57–1.0, so one floor for both would
 * reject right answers. The asymmetry is deliberate: a false "right" needs him
 * to say something else that decodes as exactly the answer, which the closed
 * vocabulary makes rare.
 */
export const ACCEPT_CONF = 0.4
/**
 * Thirteen–nineteen heard as thirty–ninety. Measured over 21 tries each: a
 * spoken tens word came back at 1.0 every time, while every teen misheard as
 * its tens partner came back at 0.50–0.65. Below this, a tens word that is the
 * partner of a teen answer is taken as the teen. A real "thirty" for 13 is
 * still wrong.
 */
export const TENS_SURE = 0.9
/** A wrong number is held at least this long after its final arrives. */
export const HOLD_MS = 300
/**
 * …and until he has been quiet this long. This is the longest pause he can
 * leave mid-count ("eight … nine … ten") before the number he paused on is
 * scored. It must also outlast the gap between a word ending and its final
 * arriving, measured in the app at 730–920ms, or a held number is scored
 * moments before the next one lands.
 *
 * Every wrong answer waits this long after he stops, so it trades pause
 * tolerance against how quickly a miss registers; right answers never wait.
 * Counting on is how a slow-but-accurate kid gets there, so it leans generous.
 * Tune from ?voicedebug logs of his real pauses.
 */
export const QUIET_MS = 1400
/** Never longer than this after its final, however noisy the room. */
export const HOLD_CAP_MS = 3000

/** A recognized word, already mapped onto the game clock (performance.now ms). */
export interface HeardWord {
  word: string
  conf: number
  startMs: number
  endMs: number
}

interface Held {
  value: number
  spokeAt: number
  /** Earliest it can be scored. */
  until: number
  /** Latest: scored by then whatever the room sounds like. */
  cap: number
}

export interface VoiceState {
  /** null between problems: nothing heard then can answer anything. */
  answer: number | null
  shownAt: number
  held: Held | null
}

export type VoiceEvent =
  | { type: 'PROBLEM'; answer: number; shownAt: number }
  | { type: 'CLOSE' }
  | { type: 'FINAL'; words: readonly HeardWord[]; now: number }
  /** `voicedAt`: the last time the mic heard sound (see vad.ts). */
  | { type: 'TICK'; now: number; voicedAt?: number }

export type VoiceOut =
  /** Goes to the engine. `spokeAt` is when he started saying the number. */
  | { kind: 'answer'; value: number; spokeAt: number }
  /** A number was heard but not clearly. UI nudge only; never scored. */
  | { kind: 'unsure' }

export interface VoiceStep {
  state: VoiceState
  out?: VoiceOut
  /** For the debug log: what let a held number through. */
  via?: 'quiet' | 'cap'
}

export const initialVoice: VoiceState = { answer: null, shownAt: 0, held: null }

const minConf = (words: readonly HeardWord[]) => Math.min(...words.map((w) => w.conf))

const isTeen = (n: number) => n >= 13 && n <= 19

/** 13 → 30, 19 → 90; null for anything that is not a teen. */
const tensPartner = (teen: number) => (isTeen(teen) ? (teen - 10) * 10 : null)

const unsure = (s: VoiceState): VoiceStep => ({ state: s, out: { kind: 'unsure' } })

const answered = (s: VoiceState, value: number, spokeAt: number): VoiceStep => ({
  state: { ...s, answer: null, held: null },
  out: { kind: 'answer', value, spokeAt },
})

/** Right answers go straight through; wrong ones wait for a follow-up. */
function judge(s: VoiceState & { answer: number }, value: number, spokeAt: number, now: number): VoiceStep {
  if (value === s.answer) return answered(s, value, spokeAt)
  return { state: { ...s, held: { value, spokeAt, until: now + HOLD_MS, cap: now + HOLD_CAP_MS } } }
}

/**
 * A held tens word finished by a lone digit: "twenty" … "four" → 24. Whether
 * or not 24 is the answer: if he meant twenty-four, the reveal should say so,
 * not "you said 4". ("one" … "hundred" needs no help: "hundred" alone is 100.)
 */
function completes(held: Held | null, nums: SpokenNumber<HeardWord>[]) {
  if (!held || held.value < 20 || held.value % 10 !== 0) return null
  if (nums.length !== 1 || nums[0].words.length !== 1) return null
  const d = nums[0].value
  return d >= 1 && d <= 9 ? held.value + d : null
}

export function voiceStep(s: VoiceState, e: VoiceEvent): VoiceStep {
  switch (e.type) {
    case 'PROBLEM':
      return { state: { answer: e.answer, shownAt: e.shownAt, held: null } }

    case 'CLOSE':
      return { state: { ...s, answer: null, held: null } }

    case 'TICK': {
      if (s.answer === null || !s.held) return { state: s }
      const quiet = e.now - (e.voicedAt ?? 0) >= QUIET_MS
      if (e.now >= s.held.until && quiet) return { ...answered(s, s.held.value, s.held.spokeAt), via: 'quiet' }
      if (e.now >= s.held.cap) return { ...answered(s, s.held.value, s.held.spokeAt), via: 'cap' }
      return { state: s }
    }

    case 'FINAL': {
      if (s.answer === null) return { state: s }
      const open = s as VoiceState & { answer: number }

      const usable = e.words.filter(
        (w) =>
          isNumberWord(w.word) &&
          w.startMs >= s.shownAt + REACTION_FLOOR_MS &&
          w.endMs - w.startMs >= MIN_WORD_MS,
      )
      // Silence, [unk], or words left over from the previous problem. The
      // recognizer also emits an empty final after every endpoint.
      if (usable.length === 0) return { state: s }

      const nums = parseNumbers(usable)

      const joined = completes(s.held, nums)
      if (joined !== null && minConf(nums[0].words) >= MIN_CONF) {
        return judge(open, joined, s.held!.spokeAt, e.now)
      }

      const last = nums[nums.length - 1]
      const conf = minConf(last.words)
      const spokeAt = last.words[0].startMs
      const value = last.value === tensPartner(open.answer) && conf < TENS_SURE ? open.answer : last.value

      if (value === open.answer && conf >= ACCEPT_CONF) return answered(s, value, spokeAt)
      // Keep any held number: a mumble after "six" does not erase the six.
      if (conf < MIN_CONF) return unsure(s)
      // One teen heard for another. The "-teen" carries the word and the
      // onset that tells them apart is the quiet part, the first thing a TV
      // in the room takes: "fifteen" came back as "thirteen" at 0.62 and 0.74
      // with one on. Never scored as a miss below TENS_SURE; he says it again.
      if (isTeen(open.answer) && isTeen(value) && conf < TENS_SURE) return unsure(s)
      return judge(open, value, spokeAt, e.now)
    }
  }
}
