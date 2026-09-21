import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '@/audio/engine'
import { formatFact } from '@/engine/facts'
import { questById } from '@/engine/quests'
import { buildCtx } from '@/engine/run'
import { comboMult } from '@/engine/scoring'
import { useGame } from '@/store/game'
import { SplatBurst, SplatField } from '../art'
import { CorrectSticker, MissSticker, STICKER_ANCHORS } from '../sprites'
import { InkLayer } from '../components/InkLayer'
import { NumberPad } from '../components/NumberPad'
import { VoiceChip, VoiceNudge } from '../components/VoiceChip'
import { useVoiceRun } from '@/voice/useVoiceRun'
import { clamp01, formatClock, useKeypad, useRaf } from '../hooks'


export function RunScreen() {
  const run = useGame((s) => s.run)
  const settings = useGame((s) => s.save.settings)
  const pulse = useGame((s) => s.pulse)
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

  useEffect(() => {
    if (!quest) return
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
  }, [quest, arm, settings.music])

  useEffect(() => () => audio.stopMusic(), [])
  useRaf((now) => tick(now), live)

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

  useEffect(() => {
    if (!run || run.answers.length === seenAnswers.current) return
    seenAnswers.current = run.answers.length
    const last = run.answers[run.answers.length - 1]
    if (!last) return
    lastWasCorrect.current = last.correct
    if (last.correct) {
      setLastCorrectAt(run.answers.length)
      audio.hit(run.streak)
      const mult = comboMult(run.streak)
      if (mult > lastMult.current) setComboStep((n) => n + 1)
      lastMult.current = mult
    } else {
      setLastMissAt(run.answers.length)
      audio.miss()
      lastMult.current = 1
      if (settings.shake) {
        setShake(true)
        window.setTimeout(() => setShake(false), 240)
      }
    }
  }, [pulse, run, settings.shake])

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

  useEffect(() => {
    if (!run) return
    const m = comboMult(run.streak)
    audio.setIntensity(m >= 3 ? 3 : m >= 2 ? 2 : m >= 1.5 ? 1 : 0)
  }, [run?.streak, run])

  if (!run || !quest) return null

  const fact = factsByKey.get(run.currentKey)!
  const width = String(fact.answer).length
  const frac = run.untimed ? 1 : clamp01(run.msLeft / 60_000)
  const urgent = !run.untimed && run.msLeft <= 10_000
  const healthy = !run.untimed && run.msLeft > 30_000
  const mult = comboMult(run.streak)
  const showWrong = run.phase === 'feedback' && run.lastCorrect === false
  const lastPoints = run.answers[lastCorrectAt - 1]?.points ?? 0
  // Rotate through the 20 sticker phrases, offset per run so it is not always
  // the same opener.
  const stickerAt = Math.max(lastCorrectAt, lastMissAt)
  const stickerMissed = lastMissAt > lastCorrectAt
  const stickerIdx = stickerAt + (run.startedAt | 0)
  const anchor = STICKER_ANCHORS[stickerIdx % STICKER_ANCHORS.length]
  // While answering, one slot per digit of the answer. Once answered, exactly
  // what was entered: a spoken "8" for 10, or "100" for 10, has a different
  // length, and padding it with "?" read as a half-typed answer.
  const slots =
    run.phase === 'playing'
      ? Array.from({ length: width }, (_, i) => run.entry[i] ?? '')
      : run.entry.split('')
  // Derived during render, not waited for in an effect: the state update lands
  // a frame after the key changes, and that one frame had the old question
  // already unmounted and the new one still at zero opacity — an empty card for
  // 16ms. Same key either way, so the element is never remounted mid-exit.
  const ref = prevProblem.current
  const leaving =
    outgoing ??
    (ref && ref.key !== run.currentKey ? { ...ref, won: lastWasCorrect.current } : null)
  const modeName = run.untimed ? 'Warm-up' : run.mode === 'blitz' ? 'Blitz Mode' : 'Sniper Mode'

  return (
    <div className="app" data-region={quest.region}>
      <div className="scene scene--arena">
        {settings.particles && <SplatField count={3} seed={11} color="#5b7bb5" opacity={0.08} />}
      </div>

      <div className="run">
        <div className="hud">
          <button className="btn btn--ghost" onClick={quit} aria-label="Stop this run" style={{ padding: '0.5em 0.8em' }}>
            &#10005;
          </button>
          <div className="hud__time">
            <span className="label">{run.untimed ? 'Warm-up' : 'Time'}</span>
            <div className="hud__clock">
              <span className="hud__digits tnum">
                {run.untimed ? `${run.problemsLeft} left` : formatClock(run.msLeft)}
              </span>
              {!run.untimed && (
                <div className={`timer${urgent ? ' timer--urgent' : healthy ? ' timer--ok' : ''}`}>
                  <div className="timer__fill" style={{ transform: `scaleX(${frac})` }} />
                </div>
              )}
            </div>
          </div>
          {run.voice && <VoiceChip />}
          <div className={`combo${mult >= 2 ? ' combo--hot' : run.streak === 0 ? ' combo--cold' : ''}`}>
            <span className="label">Combo</span>
            <span key={comboStep} className="combo__v tnum combo-step">
              x{run.streak}
            </span>
            <span className="combo__mult" data-on={mult > 1 || undefined}>
              {mult > 1 ? `${mult}\u00d7 points` : '\u00a0'}
            </span>
          </div>
        </div>

        <div className={`board${shake ? ' shake' : ''}`}>
          {settings.particles && <InkLayer pulse={pulse} enabled={settings.particles} intensity={mult / 3} />}

          <div className="board__zone">
            {stickerAt > 0 && anchor.zone === 'top' && (
              <div
                key={stickerAt}
                className="sticker"
                style={{ ['--rot' as string]: `${anchor.rot}deg` }}
                data-side={anchor.side}
                data-zone={anchor.zone}
                aria-hidden
              >
                {stickerMissed ? (
                  <MissSticker index={stickerIdx} className="sticker__img" />
                ) : (
                  <>
                    <CorrectSticker index={stickerIdx} className="sticker__img" />
                    <span className="sticker__points">+{lastPoints.toLocaleString()}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className={`panel problemcard${showWrong ? ' problemcard--dim' : ''}`}>
            {run.voice && <VoiceNudge />}
            {settings.flashes && comboStep > 0 && (
              <span key={comboStep} className="problemcard__glow" aria-hidden />
            )}
            {/* The old question leaves while the new one arrives: both sit in
                the same grid cell so the card never jumps between them. */}
            {leaving && (
              <span
                key={leaving.key}
                className={`problem tnum problem-out${leaving.won ? ' problem-out--won' : ''}`}
                aria-hidden
              >
                {leaving.left}
                <span className="problem__answer">
                  {leaving.answer.split('').map((d, i) => (
                    <span key={i} className="problem__slot">
                      {d}
                    </span>
                  ))}
                </span>
              </span>
            )}
            {/* Keyed on the fact alone. Including the answer count remounted
                this span the instant he typed the last digit, so the whole
                equation blinked out and faded back in before the old question
                had even started leaving — that was the flash before the swap. */}
            <span key={run.currentKey} className="problem tnum problem-in">
              {formatFact(fact)} ={' '}
              <span className="problem__answer">
                {slots.map((d, i) => (
                  <span key={i} className="problem__slot">
                    {d ? (
                      <span key={d} className="slot-in" style={{ display: 'inline-block' }}>
                        {d}
                      </span>
                    ) : (
                      '?'
                    )}
                  </span>
                ))}
              </span>
            </span>
          </div>

          <div className="board__zone">
            {stickerAt > 0 && anchor.zone === 'bottom' && (
              <div
                key={stickerAt}
                className="sticker"
                style={{ ['--rot' as string]: `${anchor.rot}deg` }}
                data-side={anchor.side}
                data-zone={anchor.zone}
                aria-hidden
              >
                {stickerMissed ? (
                  <MissSticker index={stickerIdx} className="sticker__img" />
                ) : (
                  <>
                    <CorrectSticker index={stickerIdx} className="sticker__img" />
                    <span className="sticker__points">+{lastPoints.toLocaleString()}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {showWrong && (
            // Tap anywhere to move on. The clock is already paused here, so
            // this beat costs him nothing but the three-second miss penalty —
            // reading the whole fact is the part that actually teaches, and a
            // reveal that vanished on a timer was gone before he had read it.
            <button
              className="fb fb--answer"
              onClick={canDismiss ? advance : undefined}
              aria-label="Next problem"
            >
              <div className="fb__answer fb-word">
                <span className="fb__answersub">Not quite</span>
                <span className="fb__answerv tnum">
                  {formatFact(fact)} = {fact.answer}
                </span>
                {run.entry !== '' && (
                  <span className="fb__answeryou">
                    you said <b className="tnum">{run.entry}</b>
                  </span>
                )}
                <span className="fb__answertap" data-ready={canDismiss || undefined}>
                  Tap to keep going
                </span>
              </div>
            </button>
          )}
        </div>

        <div className="padwrap" onClick={showWrong && canDismiss ? advance : undefined}>
          <div className={showWrong ? 'pad--dim' : ''} style={{ width: '100%', display: 'grid', placeItems: 'center' }}>
            <NumberPad onDigit={digit} onBackspace={backspace} disabled={run.phase !== 'playing'} />
          </div>
        </div>

        {count > 0 && (
          <div className="countdown">
            <span className="countdown__mode">{modeName}</span>
            <div className="countdown__n">
              <SplatBurst
                key={`s${count}`}
                className="countdown__splat count-splat-in"
                color="#f5b21f"
                color2="#ff8a1f"
                seed={count * 3}
              />
              <span key={count} className="count-in countdown__digit">
                {count}
              </span>
            </div>

            <div className="countdown__foot">
              <span className="label">
                {run.mode === 'blitz' ? 'Same facts. Faster you.' : 'Misses cost three seconds.'}
              </span>
              <div className="countdown__dots">
                {[3, 2, 1].map((n) => (
                  <span key={n} className={`countdown__dot${count <= n ? ' countdown__dot--on' : ''}`} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {count === 0 && (
        <span className="micro micro--br micro--run">
          {run.mode === 'blitz' ? (
            <>
              Focus
              <br />
              Solve
              <br />
              Repeat
            </>
          ) : showWrong ? (
            <>
              Learn
              <br />
              Adapt
              <br />
              Come back
              <br />
              stronger
            </>
          ) : (
            <>
              Keep
              <br />
              the
              <br />
              streak
            </>
          )}
        </span>
      )}
    </div>
  )
}
