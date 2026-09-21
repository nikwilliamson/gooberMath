import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

interface SpanProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode
}

/** Small caps caption: "Current quest", "Unlock at". */
export function Label({ amber, className, ...rest }: SpanProps & { amber?: boolean }) {
  return <span className={cx('label', amber && 'label--amber', className)} {...rest} />
}

/** Amber badge for a headline fact: "New best!", "Unlocked next". */
export function Pill({ className, ...rest }: SpanProps) {
  return <span className={cx('pill', className)} {...rest} />
}

/** Quiet inline stat on a translucent tile: the map's cleared count. */
export function Chip({ className, ...rest }: SpanProps) {
  return <span className={cx('chip', className)} {...rest} />
}

/** Tabular figures, for anything that counts. */
export function Num({ className, ...rest }: SpanProps) {
  return <span className={cx('tnum', className)} {...rest} />
}

export type MicroCorner = 'tl' | 'tr' | 'br'

/**
 * The tiny uppercase copy pinned in a corner of a screen. Lines are the
 * children; `run` hides it at phone width where the pad needs the room.
 */
export function Micro({
  corner,
  run,
  className,
  style,
  children,
}: {
  corner: MicroCorner
  run?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <span className={cx('micro', `micro--${corner}`, run && 'micro--run', className)} style={style}>
      {children}
    </span>
  )
}
