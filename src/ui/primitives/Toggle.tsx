import type { ReactNode } from 'react'
import { cx } from './cx'
import './Toggle.css'

/** A settings tile: icon over label, amber when on. Group them in `.toggles`. */
export function Toggle({
  icon,
  label,
  on,
  onChange,
}: {
  icon: ReactNode
  label: string
  on: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <button className={cx('toggle', on && 'toggle--on')} onClick={() => onChange(!on)} aria-pressed={on}>
      <span className="toggle__icon">{icon}</span>
      {label}
    </button>
  )
}
