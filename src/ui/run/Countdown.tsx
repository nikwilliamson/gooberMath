import { Label, cx } from '../primitives'
import './Countdown.css'

export interface CountdownProps {
  /** 3, 2, 1. The overlay is not rendered at 0. */
  count: number
  /** "Sniper Mode", "Blitz Mode", "Warm-up". */
  modeName: string
  /** One line under the digit: what this mode is about. */
  hint: string
}

/** Three, two, one, over the armed run. */
export function Countdown({ count, modeName, hint }: CountdownProps) {
  if (count <= 0) return null
  return (
    <div className="countdown">
      <span className="countdown__mode">{modeName}</span>
      <div className="countdown__n">
        <span key={count} className="count-in countdown__digit">
          {count}
        </span>
      </div>

      <div className="countdown__foot">
        <Label>{hint}</Label>
        <div className="countdown__dots">
          {[3, 2, 1].map((n) => (
            <span key={n} className={cx('countdown__dot', count <= n && 'countdown__dot--on')} />
          ))}
        </div>
      </div>
    </div>
  )
}
