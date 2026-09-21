import type { ReactNode } from 'react'
import { Button, Label, Num, cx } from '../primitives'
import { clamp01, formatClock } from '../hooks'
import './Hud.css'

export const RUN_MS = 60_000
export const URGENT_MS = 10_000
export const HEALTHY_MS = 30_000

/** The clock bar under the digits: green with time to spare, red when it is nearly gone. */
export function Timer({ msLeft }: { msLeft: number }) {
  const urgent = msLeft <= URGENT_MS
  const healthy = msLeft > HEALTHY_MS
  return (
    <div className={cx('timer', urgent && 'timer--urgent', !urgent && healthy && 'timer--ok')}>
      <div className="timer__fill" style={{ transform: `scaleX(${clamp01(msLeft / RUN_MS)})` }} />
    </div>
  )
}

/** Streak count and multiplier. `step` bumps the pop animation when the multiplier rises. */
export function Combo({ streak, mult, step }: { streak: number; mult: number; step: number }) {
  return (
    <div className={cx('combo', mult >= 2 && 'combo--hot', mult < 2 && streak === 0 && 'combo--cold')}>
      <Label>Combo</Label>
      <Num key={step} className="combo__v combo-step">
        x{streak}
      </Num>
      <span className="combo__mult" data-on={mult > 1 || undefined}>
        {mult > 1 ? `${mult}× points` : ' '}
      </span>
    </div>
  )
}

export interface HudProps {
  untimed: boolean
  msLeft: number
  problemsLeft: number
  streak: number
  mult: number
  comboStep: number
  onQuit: () => void
  /** Anything between the clock and the combo: the voice chip. */
  children?: ReactNode
}

/** The run's top bar: quit, clock, optional extras, combo. */
export function Hud({ untimed, msLeft, problemsLeft, streak, mult, comboStep, onQuit, children }: HudProps) {
  return (
    <div className="hud">
      <Button variant="ghost" iconOnly onClick={onQuit} aria-label="Stop this run">
        &#10005;
      </Button>
      <div className="hud__time">
        <Label>{untimed ? 'Warm-up' : 'Time'}</Label>
        <div className="hud__clock">
          <Num className="hud__digits">{untimed ? `${problemsLeft} left` : formatClock(msLeft)}</Num>
          {!untimed && <Timer msLeft={msLeft} />}
        </div>
      </div>
      {children}
      <Combo streak={streak} mult={mult} step={comboStep} />
    </div>
  )
}
