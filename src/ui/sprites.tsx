import type { CSSProperties } from 'react'

const IMG = `${import.meta.env.BASE_URL}img`

/**
 * One frame of a sprite sheet, drawn as a background so the browser scales it
 * on the GPU and we never ship a DOM node per frame.
 *
 * Position is col/(cols-1) because background-position percentages align the
 * same percentage of the image with that percentage of the box.
 */
export function Sprite({
  sheet,
  cols,
  rows,
  col,
  row,
  width,
  aspect,
  className,
  style,
  title,
}: {
  sheet: string
  cols: number
  rows: number
  col: number
  row: number
  /** CSS width; height follows from `aspect`. */
  width: number | string
  aspect: number
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const w = typeof width === 'number' ? `${width}px` : width
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{
        display: 'inline-block',
        width: w,
        aspectRatio: String(aspect),
        backgroundImage: `url(${IMG}/${sheet})`,
        backgroundSize: `${cols * 100}% ${rows * 100}%`,
        backgroundPosition: `${cols > 1 ? (col / (cols - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Goober: 5 x 3 pose sheet                                                    */
/* -------------------------------------------------------------------------- */

export type Pose =
  | 'idle' | 'walk' | 'run' | 'jump' | 'cheer'
  | 'crawl' | 'think' | 'point' | 'sit' | 'tablet'
  | 'ready' | 'dizzy' | 'sad' | 'stride' | 'peek'

/** [col, row] in gooberSprite.webp. */
export const POSES: Record<Pose, [number, number]> = {
  idle: [0, 0], walk: [1, 0], run: [2, 0], jump: [3, 0], cheer: [4, 0],
  crawl: [0, 1], think: [1, 1], point: [2, 1], sit: [3, 1], tablet: [4, 1],
  ready: [0, 2], dizzy: [1, 2], sad: [2, 2], stride: [3, 2], peek: [4, 2],
}

const GOOBER_ASPECT = (1200 / 5) / (1050 / 3) // 240 x 350

export function GooberSprite({
  pose = 'idle',
  width = 150,
  className,
  style,
  title,
}: {
  pose?: Pose
  width?: number | string
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const [col, row] = POSES[pose]
  return (
    <Sprite
      sheet="gooberSprite.webp"
      cols={5}
      rows={3}
      col={col}
      row={row}
      width={width}
      aspect={GOOBER_ASPECT}
      className={className}
      style={style}
      title={title}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Splats: 6 x 4 sheet, grouped by colour so feedback can stay colour-coded    */
/* -------------------------------------------------------------------------- */

export type SplatTone = 'good' | 'bad' | 'amber' | 'cool' | 'any'

const SPLAT_FRAMES: Record<SplatTone, Array<[number, number]>> = {
  good: [[2, 0], [2, 1], [5, 2], [3, 3]],
  bad: [[3, 0], [0, 1], [3, 1], [4, 2]],
  amber: [[0, 0], [5, 0], [2, 2], [0, 3], [5, 3]],
  cool: [[1, 0], [4, 0], [1, 1], [5, 1], [3, 2], [1, 3], [2, 3]],
  any: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [0, 1], [5, 1], [2, 2], [5, 2], [0, 3], [4, 3]],
}

export function SplatImg({
  tone = 'any',
  seed = 0,
  width = '100%',
  className,
  style,
}: {
  tone?: SplatTone
  seed?: number
  width?: number | string
  className?: string
  style?: CSSProperties
}) {
  const frames = SPLAT_FRAMES[tone]
  const [col, row] = frames[Math.abs(Math.floor(seed)) % frames.length]
  return (
    <Sprite
      sheet="splatSprite.webp"
      cols={6}
      rows={4}
      col={col}
      row={row}
      width={width}
      aspect={1}
      className={className}
      style={style}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Correct-answer stickers: 5 x 4 sheet of 20 phrases                          */
/* -------------------------------------------------------------------------- */

const STICKER_ASPECT = (1150 / 5) / (767 / 4)

/** Reads left-to-right, top-to-bottom, matching the sheet. */
export const STICKERS = [
  'Correct!', 'Yes!', "Let's go!", "That's right!", 'Good stuff!',
  'Correct', 'Nailed it!', 'You got it!', 'Perfect!', 'W!',
  'Big brain!', 'Sheesh!', 'Clean!', 'Valid!', 'Elite!',
  'Another one!', 'Dub!', 'On point!', 'That works!', 'Keep cookin!',
]

/**
 * Six anchors ringing the problem card. The sticker is a reward for the answer,
 * so it lands beside the equation rather than on top of it — covering the thing
 * he just read is what made the old full-screen version feel like an interruption.
 */
export const STICKER_ANCHORS = [
  { top: '4%', left: '2%', rot: -7 },
  { top: '6%', right: '2%', rot: 6 },
  { bottom: '6%', left: '4%', rot: 5 },
  { bottom: '4%', right: '3%', rot: -6 },
  { top: '26%', right: '1%', rot: 8 },
  { bottom: '24%', left: '1%', rot: -9 },
] as const

export function CorrectSticker({
  index,
  width = '100%',
  className,
  style,
}: {
  index: number
  width?: number | string
  className?: string
  style?: CSSProperties
}) {
  const i = Math.abs(Math.floor(index)) % 20
  return (
    <Sprite
      sheet="positiveSprite.webp"
      cols={5}
      rows={4}
      col={i % 5}
      row={Math.floor(i / 5)}
      width={width}
      aspect={STICKER_ASPECT}
      className={className}
      style={style}
      title={STICKERS[i]}
    />
  )
}

export const ART = {
  logo: `${IMG}/logo.webp`,
  world: `${IMG}/world.webp`,
  additionFields: `${IMG}/additionFields.webp`,
  goober: `${IMG}/goober.webp`,
}
