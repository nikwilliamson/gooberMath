import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'default' | 'amber' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `amber` is the one primary action on a screen; `ghost` sits on scenery. */
  variant?: ButtonVariant
  /** The title screen's Play button. */
  big?: boolean
  /** Glyph before the label. */
  icon?: ReactNode
  /** Glyph after the label. */
  iconAfter?: ReactNode
  /** The whole button is one glyph (back, settings, quit): a square footprint. */
  iconOnly?: boolean
}

export function Button({ variant = 'default', big, icon, iconAfter, iconOnly, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cx('btn', variant !== 'default' && `btn--${variant}`, big && 'btn--big', iconOnly && 'btn--icon', className)}
      {...rest}
    >
      {icon != null && <span className="btn__icon">{icon}</span>}
      {icon != null && children != null && ' '}
      {children}
      {iconAfter != null && children != null && ' '}
      {iconAfter != null && <span className="btn__icon">{iconAfter}</span>}
    </button>
  )
}
