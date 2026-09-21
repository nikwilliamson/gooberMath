import type { ReactNode } from 'react'
import { cx } from './cx'

export type SceneVariant = 'sky' | 'world' | 'deep'

/**
 * The full-bleed backdrop behind a screen. Either a painting (`art`, which
 * may be a `level` backdrop) or one of the flat variants. Children are
 * texture layers such as a SplatField.
 */
export function Scene({
  variant,
  art,
  level,
  vignette,
  className,
  children,
}: {
  variant?: SceneVariant
  /** Image URL for a painted scene. */
  art?: string
  /** The painting is a level backdrop rather than a map. */
  level?: boolean
  vignette?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cx(
        'scene',
        variant && `scene--${variant}`,
        art && 'scene--art',
        level && 'scene--level',
        vignette && 'scene--vignette',
        className,
      )}
      style={art ? { backgroundImage: `url(${art})` } : undefined}
    >
      {children}
    </div>
  )
}
