import { describe, expect, it } from 'vitest'
import { NUMBER_WORDS, grammarFor, parseNumbers } from './numbers'
import { createVad } from './vad'
import {
  ACCEPT_CONF, HOLD_CAP_MS, HOLD_MS, MIN_CONF, QUIET_MS, REACTION_FLOOR_MS, TENS_SURE,
  initialVoice, voiceStep, type HeardWord, type VoiceEvent, type VoiceState,
} from './voice'

const w = (word: string, startMs: number, dur = 400, conf = 1): HeardWord => ({
  word, conf, startMs, endMs: startMs + dur,
})

/** Run a sequence of events and collect every output. */
function play(events: VoiceEvent[], s: VoiceState = initialVoice) {
  const outs = []
  for (const e of events) {
    const step = voiceStep(s, e)
    s = step.state
    if (step.out) outs.push(step.out)
  }
  return { state: s, outs }
}

const SHOWN = 10_000
const problem = (answer: number): VoiceEvent => ({ type: 'PROBLEM', answer, shownAt: SHOWN })
const final = (now: number, ...words: HeardWord[]): VoiceEvent => ({ type: 'FINAL', words, now })
/** voicedAt defaults to long ago: he is silent unless a test says otherwise. */
const tick = (now: number, voicedAt = 0): VoiceEvent => ({ type: 'TICK', now, voicedAt })
const T = SHOWN + 600 // comfortably past the reaction floor

describe('numbers', () => {
  const parse = (s: string) => parseNumbers(s.split(' ').map((word) => ({ word }))).map((n) => n.value)

  it('covers every number word from zero to one hundred', () => {
    expect(NUMBER_WORDS).toHaveLength(29)
    expect(grammarFor(true)).toContain('[unk]')
    expect(grammarFor(false)).not.toContain('[unk]')
  })

  it('reads compound numbers, teens and hundreds', () => {
    expect(parse('twenty one')).toEqual([21])
    expect(parse('ninety nine')).toEqual([99])
    expect(parse('seventeen')).toEqual([17])
    expect(parse('forty')).toEqual([40])
    expect(parse('one hundred')).toEqual([100])
    expect(parse('hundred')).toEqual([100])
  })

  it('keeps a counted-on sequence as separate numbers', () => {
    expect(parse('six seven eight')).toEqual([6, 7, 8])
  })

  it('never folds zero or a teen into a tens word', () => {
    expect(parse('twenty zero')).toEqual([20, 0])
    expect(parse('twenty twelve')).toEqual([20, 12])
  })

  it('skips anything that is not a number word', () => {
    expect(parse('[unk] seven')).toEqual([7])
  })
})

describe('voiceStep', () => {
  it('accepts a right answer the moment its final arrives', () => {
    const { outs } = play([problem(7), final(T + 900, w('seven', T))])
    expect(outs).toEqual([{ kind: 'answer', value: 7, spokeAt: T }])
  })

  it('times the answer from when he started the number, not when the recognizer finished', () => {
    const { outs } = play([problem(21), final(T + 1400, w('twenty', T), w('one', T + 450))])
    expect(outs).toEqual([{ kind: 'answer', value: 21, spokeAt: T }])
  })

  it('holds a wrong answer, then scores it once nothing follows', () => {
    const r1 = play([problem(8), final(T + 900, w('six', T))])
    expect(r1.outs).toEqual([])
    expect(voiceStep(r1.state, tick(T + 900 + HOLD_MS - 1)).out).toBeUndefined()
    expect(voiceStep(r1.state, tick(T + 900 + HOLD_MS)).out).toEqual({ kind: 'answer', value: 6, spokeAt: T })
  })

  it('counting on in one breath lands on the last number', () => {
    const { outs } = play([problem(8), final(T + 2000, w('six', T), w('seven', T + 600), w('eight', T + 1200))])
    expect(outs).toEqual([{ kind: 'answer', value: 8, spokeAt: T + 1200 }])
  })

  it('counting on with pauses is never marked wrong on the way up', () => {
    // Timings from the end-to-end run: 500ms gaps, each final ~450ms after its word.
    const { outs } = play([
      problem(8),
      final(T + 850, w('six', T)),                    // six: T..T+400
      tick(T + 1000, T + 400),
      tick(T + 1450, T + 1300),                       // saying seven (T+900..T+1300)
      tick(T + 1700, T + 1300),                       // past HOLD_MS, but quiet only 400ms
      final(T + 1750, w('seven', T + 900)),
      tick(T + 2300, T + 2200),                       // saying eight
      final(T + 2650, w('eight', T + 1800)),
    ])
    expect(outs).toEqual([{ kind: 'answer', value: 8, spokeAt: T + 1800 }])
  })

  it('scores a held wrong answer once he has gone quiet', () => {
    const r = play([problem(8), final(T + 850, w('six', T))])
    const lastSound = T + 400
    // Both have to be true: the minimum hold has passed AND he has been quiet.
    const due = Math.max(T + 850 + HOLD_MS, lastSound + QUIET_MS)
    expect(voiceStep(r.state, tick(due - 1, lastSound)).out).toBeUndefined()
    expect(voiceStep(r.state, tick(due, lastSound)).out).toEqual({ kind: 'answer', value: 6, spokeAt: T })
    // Still making sound at `due`: keep holding.
    expect(voiceStep(r.state, tick(due, due - 100)).out).toBeUndefined()
  })

  it('never holds past the cap, however noisy the room', () => {
    const r = play([problem(8), final(T + 850, w('six', T))])
    const noisy = (now: number) => tick(now, now) // sound on every tick
    expect(voiceStep(r.state, noisy(T + 850 + HOLD_CAP_MS - 1)).out).toBeUndefined()
    expect(voiceStep(r.state, noisy(T + 850 + HOLD_CAP_MS)).out).toEqual({ kind: 'answer', value: 6, spokeAt: T })
  })

  it('joins a tens word to a digit said after a pause', () => {
    const { outs } = play([problem(24), final(T + 900, w('twenty', T)), final(T + 1700, w('four', T + 900))])
    expect(outs).toEqual([{ kind: 'answer', value: 24, spokeAt: T }])
  })

  it('reports what he actually said when the joined number is wrong', () => {
    const r = play([problem(34), final(T + 900, w('twenty', T)), final(T + 1700, w('four', T + 900))])
    expect(r.outs).toEqual([])
    expect(voiceStep(r.state, tick(T + 1700 + HOLD_MS)).out).toEqual({ kind: 'answer', value: 24, spokeAt: T })
  })

  it('never scores a guess, and a mumble does not erase a held number', () => {
    const low = MIN_CONF - 0.1
    const r = play([problem(8), final(T + 900, w('six', T)), final(T + 1300, w('nine', T + 600, 400, low))])
    expect(r.outs).toEqual([{ kind: 'unsure' }])
    expect(voiceStep(r.state, tick(T + 900 + HOLD_MS)).out).toEqual({ kind: 'answer', value: 6, spokeAt: T })
  })

  // Confidences below are the real decoder's, from the teen/tens measurement.
  it('accepts a right answer the recognizer was only moderately sure of', () => {
    const { outs } = play([problem(13), final(T + 900, w('thirteen', T, 400, 0.57))])
    expect(outs).toEqual([{ kind: 'answer', value: 13, spokeAt: T }])
  })

  it('still will not accept a right answer that is barely a guess', () => {
    const { outs } = play([problem(13), final(T + 900, w('thirteen', T, 400, ACCEPT_CONF - 0.05))])
    expect(outs).toEqual([{ kind: 'unsure' }])
  })

  it('takes an unsure tens word as the teen it is partnered with', () => {
    for (const [answer, word, conf] of [[13, 'thirty', 0.53], [18, 'eighty', 0.65], [19, 'ninety', 0.5]] as const) {
      const { outs } = play([problem(answer), final(T + 900, w(word, T, 400, conf))])
      expect(outs).toEqual([{ kind: 'answer', value: answer, spokeAt: T }])
    }
  })

  it('still marks a clearly spoken tens word wrong for a teen answer', () => {
    const r = play([problem(13), final(T + 900, w('thirty', T, 400, 1))])
    expect(r.outs).toEqual([])
    expect(r.state.held?.value).toBe(30)
  })

  it('does not rescue a tens word for anything but its own teen', () => {
    // "eighty" at 0.65 for 13: not its partner, so an ordinary wrong answer.
    const r = play([problem(13), final(T + 900, w('eighty', T, 400, TENS_SURE - 0.25))])
    expect(r.outs).toEqual([])
    expect(r.state.held?.value).toBe(80)
  })

  it('ignores words from before the problem appeared, and inside the reaction floor', () => {
    const { outs, state } = play([
      problem(5),
      final(SHOWN + 300, w('seven', SHOWN - 200)),          // tail of the last answer
      final(SHOWN + 500, w('three', SHOWN + REACTION_FLOOR_MS - 10)), // hit-sound bleed
    ])
    expect(outs).toEqual([])
    expect(state.held).toBeNull()
  })

  it('ignores blips too short to be a spoken number', () => {
    expect(play([problem(5), final(T + 500, w('eight', T, 60))]).outs).toEqual([])
  })

  it('treats an empty final as silence, not as "unsure"', () => {
    expect(play([problem(5), final(T + 500)]).outs).toEqual([])
    expect(play([problem(5), final(T + 500, w('[unk]', T))]).outs).toEqual([])
  })

  it('answers once per problem, and nothing between problems', () => {
    const { outs } = play([
      problem(7),
      final(T + 900, w('seven', T)),
      final(T + 1500, w('seven', T + 800)), // repeated himself
      { type: 'CLOSE' },
      final(T + 2500, w('seven', T + 1800)),
    ])
    expect(outs).toHaveLength(1)
  })

  it('a new problem drops anything held from the last one', () => {
    const r = play([problem(8), final(T + 900, w('six', T)), { type: 'PROBLEM', answer: 3, shownAt: T + 1000 }])
    expect(voiceStep(r.state, tick(T + 5000)).out).toBeUndefined()
  })
})

describe('vad', () => {
  it('marks speech above a quiet room', () => {
    const vad = createVad()
    for (let t = 0; t < 2000; t += 43) vad.push(0.004, t)
    expect(vad.voicedAt).toBe(0)
    vad.push(0.08, 2100)
    expect(vad.voicedAt).toBe(2100)
  })

  it('settles on steady music bleed instead of treating it as him talking', () => {
    const vad = createVad()
    // 20s of steady bleed at 0.03, then speech well above it.
    for (let t = 0; t < 20_000; t += 43) vad.push(0.03, t)
    const settled = vad.voicedAt
    for (let t = 20_000; t < 21_000; t += 43) vad.push(0.03, t)
    expect(vad.voicedAt).toBe(settled) // bleed alone no longer counts
    vad.push(0.2, 21_100)
    expect(vad.voicedAt).toBe(21_100)
  })
})
