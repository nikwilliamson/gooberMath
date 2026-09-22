import { Label, cx } from '../primitives'
import './Countdown.css'

export interface CountdownProps {
  /** 3, 2, 1. The overlay is not rendered at 0. */
  count: number
  /** "Sniper Mode", "Blitz Mode", "Warm-up". */
  modeName: string
  /** One line under the digit: what this mode is about. */
  hint: string
  /** Holding before the count: the digit waits rather than counts. */
  waiting?: boolean
}

/** Three, two, one, over the armed run. */
export function Countdown({ count, modeName, hint, waiting }: CountdownProps) {
  if (count <= 0) return null
  return (
    <div className="countdown" data-waiting={waiting || undefined}>
      <span className="countdown__mode">{modeName}</span>
      <div className="countdown__n">
        <span key={waiting ? 'wait' : count} className={cx('count-in countdown__digit', waiting && 'countdown__digit--wait')}>
          {count}
        </span>
      </div>

      <div className="countdown__foot">
        <Label>{hint}</Label>
        <div className="countdown__dots">
          {[3, 2, 1].map((n) => (
            <span key={n} className={cx('countdown__dot', !waiting && count <= n && 'countdown__dot--on')} />
          ))}
        </div>
      </div>
    </div>
  )
}
