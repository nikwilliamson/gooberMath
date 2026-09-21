import type { ReactNode } from 'react'
import { Panel, cx } from '../primitives'

export interface LeavingProblem {
  key: string
  /** The whole left side including the equals sign: "3 + 5 = ". */
  left: string
  answer: string
  won: boolean
}

export interface ProblemCardProps {
  /** Fact key; the equation remounts (and animates in) when it changes. */
  factKey: string
  /** Left side without the equals sign: "3 + 5". */
  left: string
  /** One entry per answer slot; '' renders as "?". */
  slots: string[]
  /** The previous question on its way out, overlapping the new one. */
  leaving?: LeavingProblem | null
  /** Combo step; when above zero the card flashes, keyed so each rise flashes again. */
  glow?: number
  /** Dimmed behind the wrong-answer reveal. */
  dim?: boolean
  /** Sits above the equation: the voice nudge. */
  children?: ReactNode
}

/** The equation and its answer slots. */
export function ProblemCard({ factKey, left, slots, leaving, glow = 0, dim, children }: ProblemCardProps) {
  return (
    <Panel className={cx('problemcard', dim && 'problemcard--dim')}>
      {children}
      {glow > 0 && <span key={glow} className="problemcard__glow" aria-hidden />}
      {/* The old question leaves while the new one arrives: both sit in the
          same grid cell so the card never jumps between them. */}
      {leaving && (
        <span
          key={leaving.key}
          className={cx('problem tnum problem-out', leaving.won && 'problem-out--won')}
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
      {/* Keyed on the fact alone. Including the answer count remounted this
          span the instant he typed the last digit, so the whole equation
          blinked out and faded back in before the old question had even
          started leaving — that was the flash before the swap. */}
      <span key={factKey} className="problem tnum problem-in">
        {left} ={' '}
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
    </Panel>
  )
}
