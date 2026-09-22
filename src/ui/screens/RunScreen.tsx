import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '@/audio/engine'
import { formatFact } from '@/engine/facts'
import { questById } from '@/engine/quests'
import { buildCtx } from '@/engine/run'
import { comboMult } from '@/engine/scoring'
import { useGame } from '@/store/game'
import { useVoiceStatus } from '@/voice/status'
import { useVoiceRun } from '@/voice/useVoiceRun'
import { VoiceChip, VoiceNudge } from '../components/VoiceChip'
import { useKeypad, useRaf } from '../hooks'
import { RunView } from '../run/RunView'
import { STICKER_ANCHORS } from '../sprites'

/** Store ticks per second while the clock runs. */
const TICK_MS = 50
/** A voice run holds the countdown until the model is ready, up to this long. */
const VOICE_WAIT_MS = 15_000

/**
 * Wires the run to the store: countdown, clock, input, audio, and the
 * choreography around answers. Everything visible is RunView.
 */
export function RunScreen() {
  const run = useGame((s) => s.run)
  const settings = useGame((s) => s.save.settings)
  const tick = useGame((s) => s.tick)
  const arm = useGame((s) => s.arm)
  const digit = useGame((s) => s.digit)
  const backspace = useGame((s) => s.backspace)
  const advance = useGame((s) => s.advance)
  const quit = useGame((s) => s.quit)

  const [count, setCount] = useState(3)
  const [live, setLive] = useState(false)
  const [shake, setShake] = useState(false)
  const seenAnswers = useRef(0)
  const lastMult = useRef(1)
  const [comboStep, setComboStep] = useState(0)
  const [lastCorrectAt, setLastCorrectAt] = useState(0)
  const [lastMissAt, setLastMissAt] = useState(0)
  /** The question he just answered, kept on screen long enough to leave. */
  const [outgoing, setOutgoing] = useState<
    { key: string; left: string; answer: string; won: boolean } | null
  >(null)
  const prevProblem = useRef<{ key: string; left: string; answer: string } | null>(null)
  const lastWasCorrect = useRef(false)

  const quest = run ? questById(run.questId) : null
  const factsByKey = useMemo(() => (quest ? buildCtx(quest).byKey : new Map()), [quest])

  // A voice run's mic cannot open until the model has loaded, and on a fresh
  // page that can take several seconds: started blind, the first problems
  // would not hear him. So the countdown holds at 3 until the model reports
  // ready (or fails, in which case the keypad run goes ahead), capped so a
  // stalled download can never hold the game hostage.
  const model = useVoiceStatus((s) => s.model)
  const [waitedOut, setWaitedOut] = useState(false)
  const waiting = Boolean(run?.voice) && (model === 'idle' || model === 'loading') && !waitedOut
  useEffect(() => {
    if (!waiting) return
    const id = window.setTimeout(() => setWaitedOut(true), VOICE_WAIT_MS)
    return () => window.clearTimeout(id)
  }, [waiting])

  useEffect(() => {
    if (!quest || waiting) return
    let n = 3
    audio.countdownBeep()
    const id = window.setInterval(() => {
      n -= 1
      if (n > 0) {
        setCount(n)
        audio.countdownBeep()
      } else {
        window.clearInterval(id)
        audio.countdownBeep(true)
        setCount(0)
        arm(performance.now())
        setLive(true)
        if (settings.music) audio.startMusic(run?.untimed ?? false)
      }
    }, 700)
    return () => window.clearInterval(id)
  }, [quest, arm, settings.music, waiting])

  useEffect(() => () => audio.stopMusic(), [])
  // The clock reads to the second and the bar tweens over 100ms, so the store
  // does not need a new run object every frame; 20 a second re-renders the
  // screen a third as often with no visible difference.
  const lastTick = useRef(0)
  useRaf((now) => {
    if (now - lastTick.current < TICK_MS) return
    lastTick.current = now
    tick(now)
  }, live)

  // Voice is a second way in, never a replacement: the keypad stays live.
  useVoiceRun({
    enabled: run?.voice ?? false,
    playing: live && run?.phase === 'playing',
    answer: run ? (factsByKey.get(run.currentKey)?.answer ?? -1) : -1,
    shownAt: run?.shownAt ?? 0,
  })
  useKeypad(live && run?.phase === 'playing', { digit, backspace, escape: quit })

  // The reveal ignores input for a beat before it will accept a dismissal.
  // Without that, the very tap that answered wrong dismissed it: the pad
  // submits on pointerdown, and the click that follows the same finger press
  // lands on a reveal that only exists because of it. The pause also stops him
  // blowing past the answer mid-flow, which is the one thing it is there for.
  const held = run?.phase === 'feedback' && run.lastCorrect === false
  const [canDismiss, setCanDismiss] = useState(false)
  useEffect(() => {
    if (!held) return setCanDismiss(false)
    const id = window.setTimeout(() => setCanDismiss(true), 450)
    return () => window.clearTimeout(id)
  }, [held])

  // Keyboard players get the same dismissal as the tap: any key moves on.
  useEffect(() => {
    if (!held || !canDismiss) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return
      e.preventDefault()
      advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [held, canDismiss, advance])

  const answered = run?.answers.length ?? 0
  useEffect(() => {
    if (!run || answered === seenAnswers.current) return
    seenAnswers.current = answered
    const last = run.answers[answered - 1]
    if (!last) return
    lastWasCorrect.current = last.correct
    if (last.correct) {
      setLastCorrectAt(answered)
      audio.hit(run.streak)
      const mult = comboMult(run.streak)
      if (mult > lastMult.current) setComboStep((n) => n + 1)
      lastMult.current = mult
    } else {
      setLastMissAt(answered)
      audio.miss()
      lastMult.current = 1
      if (settings.shake) {
        setShake(true)
        window.setTimeout(() => setShake(false), 240)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, settings.shake])

  // A question swaps out only when the next one is actually on screen, so the
  // exit and entrance overlap instead of leaving a hole where the problem was.
  // This keys on the fact itself, not on `run`: depending on the whole run
  // object re-ran the effect on every animation frame, and each re-run's
  // cleanup cancelled the timer that was supposed to retire the old question.
  useEffect(() => {
    if (!run) return
    const fact = factsByKey.get(run.currentKey)
    if (!fact) return
    const prev = prevProblem.current
    prevProblem.current = {
      key: run.currentKey,
      left: `${formatFact(fact)} = `,
      answer: String(fact.answer),
    }
    if (!prev || prev.key === run.currentKey) return
    setOutgoing({ ...prev, won: lastWasCorrect.current })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.currentKey, factsByKey])

  useEffect(() => {
    if (!outgoing) return
    const id = window.setTimeout(() => setOutgoing(null), 320)
    return () => window.clearTimeout(id)
  }, [outgoing])

  const streak = run?.streak ?? 0
  useEffect(() => {
    const m = comboMult(streak)
    audio.setIntensity(m >= 3 ? 3 : m >= 2 ? 2 : m >= 1.5 ? 1 : 0)
  }, [streak])

  // Everything below is derived with `run` possibly null so the memos can sit
  // above the early return; RunView's children are memoised on these objects,
  // so a tick that only moves the clock re-renders the HUD and nothing else.
  const fact = run ? factsByKey.get(run.currentKey) : undefined
  const entry = run?.entry ?? ''
  const phase = run?.phase ?? 'over'
  const width = fact ? String(fact.answer).length : 0
  const mult = comboMult(streak)
  const showWrong = phase === 'feedback' && run?.lastCorrect === false
  const lastPoints = run?.answers[lastCorrectAt - 1]?.points ?? 0
  // Rotate through the 20 sticker phrases, offset per run so it is not always
  // the same opener.
  const stickerAt = Math.max(lastCorrectAt, lastMissAt)
  const stickerIdx = stickerAt + ((run?.startedAt ?? 0) | 0)
  const currentKey = run?.currentKey ?? ''
  // Derived during render, not waited for in an effect: the state update lands
  // a frame after the key changes, and that one frame had the old question
  // already unmounted and the new one still at zero opacity — an empty card for
  // 16ms. Same key either way, so the element is never remounted mid-exit.
  const ref = prevProblem.current
  const leaving = outgoing ?? (ref && ref.key !== currentKey ? { ...ref, won: lastWasCorrect.current } : null)
  const glow = settings.flashes ? comboStep : 0

  const problem = useMemo(
    () => ({
      factKey: currentKey,
      left: fact ? formatFact(fact) : '',
      // While answering, one slot per digit of the answer. Once answered,
      // exactly what was entered: a spoken "8" for 10, or "100" for 10, has a
      // different length, and padding it with "?" read as a half-typed answer.
      slots: phase === 'playing' ? Array.from({ length: width }, (_, i) => entry[i] ?? '') : entry.split(''),
      leaving,
      glow,
    }),
    [currentKey, fact, phase, width, entry, leaving, glow],
  )
  const sticker = useMemo(
    () =>
      stickerAt > 0
        ? {
            at: stickerAt,
            index: stickerIdx,
            missed: lastMissAt > lastCorrectAt,
            points: lastPoints,
            anchor: STICKER_ANCHORS[stickerIdx % STICKER_ANCHORS.length],
          }
        : null,
    [stickerAt, stickerIdx, lastMissAt, lastCorrectAt, lastPoints],
  )
  const reveal = useMemo(
    () => (showWrong && fact ? { left: formatFact(fact), answer: fact.answer, entry, ready: canDismiss } : null),
    [showWrong, fact, entry, canDismiss],
  )

  // Stable elements, or the memoised card would re-render for a new <VoiceNudge/> every tick.
  const voice = run?.voice ?? false
  const hudExtra = useMemo(() => (voice ? <VoiceChip /> : undefined), [voice])
  const problemExtra = useMemo(() => (voice ? <VoiceNudge /> : undefined), [voice])

  if (!run || !quest || !fact) return null

  return (
    <RunView
      region={quest.region}
      mode={run.mode}
      untimed={run.untimed}
      count={count}
      waiting={waiting}
      hud={{
        untimed: run.untimed,
        msLeft: run.msLeft,
        problemsLeft: run.problemsLeft,
        streak: run.streak,
        mult,
        comboStep,
        onQuit: quit,
      }}
      problem={problem}
      sticker={sticker}
      reveal={reveal}
      shake={shake}
      padLive={phase === 'playing'}
      onDigit={digit}
      onBackspace={backspace}
      onDismiss={advance}
      hudExtra={hudExtra}
      problemExtra={problemExtra}
    />
  )
}
