import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '@/audio/engine'
import { formatFact } from '@/engine/facts'
import { questById } from '@/engine/quests'
import { buildCtx } from '@/engine/run'
import { comboMult } from '@/engine/scoring'
import { useGame } from '@/store/game'
import { ARENA_INKS, Goober, SplatField, Starburst } from '../art'
import { InkLayer } from '../components/InkLayer'
import { NumberPad } from '../components/NumberPad'
import { clamp01, formatClock, useKeypad, useRaf } from '../hooks'

const CHEERS = ['YES!', 'NICE!', 'BOOM!', 'FAST!', 'GOT IT!']
const NUDGES = ['Shake it off! Next one!', 'No worries. Keep going!', 'Now you know it!', "That one's tricky!"]

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
  // Rebuilding the fact table every frame would be a real cost at 60fps.
  const factsByKey = useMemo(() => (quest ? buildCtx(quest).byKey : new Map()), [quest])

  // Countdown, then anchor the clock so the 3-2-1 does not cost him time.
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

  useKeypad(live && run?.phase === 'playing', {
    digit,
    backspace,
    escape: quit,
  })

  // React to each resolved answer: sound, shake, flash.
  useEffect(() => {
    if (!run || run.answers.length === seenAnswers.current) return
    seenAnswers.current = run.answers.length
    const last = run.answers[run.answers.length - 1]
    if (!last) return
    if (last.correct) {
      audio.hit(run.streak)
      const mult = comboMult(run.streak)
      if (mult > lastMult.current && settings.flashes) {
        setFlash('rgba(255,255,255,0.55)')
        window.setTimeout(() => setFlash(null), 260)
      }
      lastMult.current = mult
    } else {
      audio.miss()
      lastMult.current = 1
      if (settings.shake) {
        setShake(true)
        window.setTimeout(() => setShake(false), 260)
      }
      if (settings.flashes) {
        setFlash('rgba(255,77,109,0.5)')
        window.setTimeout(() => setFlash(null), 260)
      }
    }
  }, [pulse, run, settings.flashes, settings.shake])

  // Music intensity follows the combo.
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
  const warn = !run.untimed && run.msLeft <= 20_000 && !urgent
  const mult = comboMult(run.streak)
  const showWrong = run.phase === 'feedback' && run.lastCorrect === false
  const showRight = run.phase === 'feedback' && run.lastCorrect === true
  const lastPoints = run.answers[run.answers.length - 1]?.points ?? 0
  const cheer = CHEERS[run.answers.length % CHEERS.length]
  const nudge = NUDGES[run.answers.length % NUDGES.length]

  const slots = Array.from({ length: width }, (_, i) => run.entry[i] ?? '')

  return (
    <div className="app" data-region={quest.region}>
      <div className="scene scene--arena">{settings.particles && <SplatField count={7} seed={7} opacity={0.3} palette={ARENA_INKS} />}</div>
      {flash && <div className="flash" style={{ background: flash }} />}

      <div className={`run${shake ? ' shake' : ''}`}>
        <div className="hud">
          <button className="hud__quit" onClick={quit} aria-label="Stop this run">
            &#10005;
          </button>
          <div className="hud__time">
            <span className="hud__label">{run.untimed ? 'Warm-up' : 'Time'}</span>
            <div className="hud__clock">
              <span className="hud__digits outline">
                {run.untimed ? `${run.problemsLeft} left` : formatClock(run.msLeft)}
              </span>
              {!run.untimed && (
                <div className={`timer${urgent ? ' timer--urgent' : warn ? ' timer--warn' : ''}`}>
                  <div className="timer__fill" style={{ transform: `scaleX(${frac})` }} />
                </div>
              )}
            </div>
            <span className="hud__label">
              {quest.name} &middot; {run.untimed ? 'practice' : run.mode === 'blitz' ? 'Blitz' : 'Sniper'} &middot;{' '}
              <span className="tnum">{run.score.toLocaleString()}</span> pts
            </span>
          </div>

          <div className="combowrap">
            <div className="combobadge">
              <Starburst fill={run.streak > 0 ? '#f2731f' : '#4a5a7a'} />
              <span className="combobadge__text outline">
                <span className="combobadge__k">COMBO</span>
                <span className="combobadge__v">x{run.streak}</span>
              </span>
            </div>
            {mult > 1 && <span className="combomult">{mult}&times; pts</span>}
          </div>
        </div>

        <div className="board">
          {settings.particles && <InkLayer pulse={pulse} enabled={settings.particles} intensity={mult / 3} />}

          {showRight ? (
            <div className="pop" style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
              <span className="verdict outline outline--thick">{cheer}</span>
              <span className="verdict__points outline">+{lastPoints.toLocaleString()}</span>
            </div>
          ) : showWrong ? (
            <>
              <div className="parch problemcard pop">
                <div className="oops">
                  <span className="oops__label">Oops!</span>
                  <span className="oops__sub">The answer was</span>
                  <span className="oops__answer tnum">{fact.answer}</span>
                </div>
              </div>
              <div className="mascotline">
                <Goober mood="sad" hue={222} size={72} />
                <span className="bubble">{nudge}</span>
              </div>
            </>
          ) : (
            <div className="parch problemcard">
              <span className="problem tnum">
                {formatFact(fact)} ={' '}
                {slots.map((d, i) => (
                  <span key={i} className={`problem__slot${d ? ' problem__slot--filled' : ''}`}>
                    {d || '?'}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="padwrap">
          <NumberPad onDigit={digit} onBackspace={backspace} disabled={run.phase !== 'playing'} />
        </div>

        {count > 0 && (
          <div className="countdown">
            <span className="countdown__mode outline">
              {run.untimed ? 'Warm-up' : run.mode === 'blitz' ? 'Blitz Mode' : 'Sniper Mode'}
            </span>
            <span className="countdown__n outline outline--thick">{count}</span>
            <span className="countdown__sub">
              {run.mode === 'blitz' ? 'Fast answers = bigger combos' : 'Misses cost 3 seconds'}
            </span>
          </div>
        )}
      </div>

    </div>
  )
}
