import type { HTMLAttributes } from 'react'
import { cx } from './cx'

/** Translucent, blurred surface over the scene. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('panel', className)} {...rest} />
}
