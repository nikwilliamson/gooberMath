import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '@/audio/engine'
import { formatFact } from '@/engine/facts'
import { questById } from '@/engine/quests'
import { buildCtx } from '@/engine/run'
import { comboMult } from '@/engine/scoring'
import { useGame } from '@/store/game'
import { GooberCap, RoughText, SplatBurst, SplatField } from '../art'
import { InkLayer } from '../components/InkLayer'
import { NumberPad } from '../components/NumberPad'
import { clamp01, formatClock, useKeypad, useRaf } from '../hooks'

const CHEERS = ['Yes!', 'Nice!', 'Boom!', 'Fast!', 'Clean!']

export function RunScreen() {
  const run = useGame((s) => s.run)
  const settings = useGame((s) => s.save.settings)
  const pulse = useGame((s) => s.pulse)
  const tick = useGame((s) => s.tick)
  const arm = useGame((s) => s.arm)
  const digit = useGame((s) => s.digit)
  const backspace = useGame((s) => s.backspace)
  const quit = useGame((s) => s.quit)

  const [count, setCount] = useState(3)
  const [live, setLive] = useState(false)
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const seenAnswers = useRef(0)
  const lastMult = useRef(1)

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
        if (settings.music) audio.startMusic()
      }
    }, 700)
    return () => window.clearInterval(id)
  }, [quest, arm, settings.music])

  useEffect(() => () => audio.stopMusic(), [])
  useRaf((now) => tick(now), live)
  useKeypad(live && run?.phase === 'playing', { digit, backspace, escape: quit })

  useEffect(() => {
    if (!run || run.answers.length === seenAnswers.current) return
    seenAnswers.current = run.answers.length
    const last = run.answers[run.answers.length - 1]
    if (!last) return
    if (last.correct) {
      audio.hit(run.streak)
      const mult = comboMult(run.streak)
      if (mult > lastMult.current && settings.flashes) {
        setFlash('rgba(110,224,95,0.4)')
        window.setTimeout(() => setFlash(null), 240)
      }
      lastMult.current = mult
    } else {
      audio.miss()
      lastMult.current = 1
      if (settings.shake) {
        setShake(true)
        window.setTimeout(() => setShake(false), 240)
      }
      if (settings.flashes) {
        setFlash('rgba(255,77,94,0.35)')
        window.setTimeout(() => setFlash(null), 240)
      }
    }
  }, [pulse, run, settings.flashes, settings.shake])

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
  const showRight = run.phase === 'feedback' && run.lastCorrect === true
  const lastPoints = run.answers[run.answers.length - 1]?.points ?? 0
  const cheer = CHEERS[run.answers.length % CHEERS.length]
  const slots = Array.from({ length: width }, (_, i) => run.entry[i] ?? '')
  const modeName = run.untimed ? 'Warm-up' : run.mode === 'blitz' ? 'Blitz Mode' : 'Sniper Mode'

  return (
    <div className="app" data-region={quest.region}>
      <div className="scene scene--arena">
        {settings.particles && <SplatField count={3} seed={11} color="#5b7bb5" opacity={0.08} />}
      </div>
      {flash && <div className="flash" style={{ background: flash }} />}

      <div className={`run${shake ? ' shake' : ''}`}>
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
          <div className={`combo${mult >= 2 ? ' combo--hot' : run.streak === 0 ? ' combo--cold' : ''}`}>
            <span className="label">Combo</span>
            <span className="combo__v tnum">x{run.streak}</span>
            {mult > 1 && <span className="combo__mult">{mult}&times; points</span>}
          </div>
        </div>

        <div className="board">
          {settings.particles && <InkLayer pulse={pulse} enabled={settings.particles} intensity={mult / 3} />}

          <div className="panel problemcard">
            <span className="problem tnum">
              {formatFact(fact)} ={' '}
              {slots.map((d, i) => (
                <span key={i} className="problem__slot">
                  {d || '?'}
                </span>
              ))}
            </span>
            <span className="problem__rule" />
          </div>

          {showRight && (
            <div className="fb pop">
              {settings.particles && (
                <SplatBurst className="fb__splat" color="#6ee05f" color2="#a8f58c" seed={run.answers.length} />
              )}
              <RoughText text={cheer} size={140} color="#ffffff" seed={run.answers.length} className="fb__word" />
              <span className="fb__points fb__points--good">+{lastPoints.toLocaleString()}</span>
            </div>
          )}

          {showWrong && (
            <div className="fb pop">
              {settings.particles && (
                <SplatBurst className="fb__splat" color="#ff4d5e" color2="#7a1020" seed={run.answers.length + 5} />
              )}
              <RoughText text="Oops" size={130} color="#ff4d5e" seed={run.answers.length + 2} className="fb__word" />
              <div className="fb__answer">
                <span className="fb__answersub">The answer was</span>
                <span className="fb__answerv tnum">{fact.answer}</span>
              </div>
            </div>
          )}
        </div>

        <div className="padwrap">
          <div className={showRight || showWrong ? 'pad--dim' : ''} style={{ width: '100%', display: 'grid', placeItems: 'center' }}>
            <NumberPad onDigit={digit} onBackspace={backspace} disabled={run.phase !== 'playing'} />
          </div>
        </div>

        {count > 0 && (
          <div className="countdown">
            <span className="countdown__mode">{modeName}</span>
            <div className="countdown__n">
              <SplatBurst className="countdown__splat" color="#f5b21f" color2="#ff8a1f" seed={count * 3} />
              <RoughText text={String(count)} size={210} color="var(--amber)" seed={count} />
            </div>
            <span className="label">
              {run.mode === 'blitz' ? 'Same facts. Faster you.' : 'Misses cost three seconds.'}
            </span>
            <div className="countdown__dots">
              {[3, 2, 1].map((n) => (
                <span key={n} className={`countdown__dot${count <= n ? ' countdown__dot--on' : ''}`} />
              ))}
            </div>
            <GooberCap size={112} style={{ marginTop: 18, opacity: 0.85 }} />
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
