import type { Op } from '@/engine/types'
import type { CSSProperties } from 'react'
import frames from './spriteFrames.json'

const IMG = `${import.meta.env.BASE_URL}img`

interface SheetData {
  sheet: string
  width: number
  height: number
  frames: Array<[number, number, number, number]>
}

const SHEETS = frames as unknown as Record<string, SheetData>

/**
 * One frame of a sprite sheet, drawn as a background so the browser scales it
 * on the GPU and we never ship a DOM node per frame.
 *
 * Frame rects are measured from the artwork by scripts/optimize-art.py, not
 * assumed from an even grid: these sheets are not evenly spaced, and positioning
 * against an assumed grid pulls slivers of the neighbouring frames into view.
 */
export function Sprite({
  sheet,
  index,
  width,
  className,
  style,
  title,
}: {
  /** Key in spriteFrames.json. */
  sheet: string
  index: number
  width: number | string
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const data = SHEETS[sheet]
  const [x, y, w, h] = data.frames[Math.abs(Math.floor(index)) % data.frames.length]
  const cssWidth = typeof width === 'number' ? `${width}px` : width
  // Standard sprite maths: scale the sheet so this frame fills the box, then
  // offset by the frame's share of the remaining space.
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{
        display: 'inline-block',
        width: cssWidth,
        aspectRatio: `${w} / ${h}`,
        backgroundImage: `url(${IMG}/${data.sheet})`,
        backgroundSize: `${(data.width / w) * 100}% ${(data.height / h) * 100}%`,
        backgroundPosition: `${data.width === w ? 0 : (x / (data.width - w)) * 100}% ${
          data.height === h ? 0 : (y / (data.height - h)) * 100
        }%`,
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

/** Frame index in gooberSprite, row-major across the 5 x 3 sheet. */
export const POSES: Record<Pose, number> = {
  idle: 0, walk: 1, run: 2, jump: 3, cheer: 4,
  crawl: 5, think: 6, point: 7, sit: 8, tablet: 9,
  ready: 10, dizzy: 11, sad: 12, stride: 13, peek: 14,
}

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
  return (
    <Sprite
      sheet="gooberSprite"
      index={POSES[pose]}
      width={width}
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

/** Frame indices into the 6 x 4 splat sheet, grouped by colour family. */
const SPLAT_FRAMES: Record<SplatTone, number[]> = {
  good: [2, 8, 17, 21],
  bad: [3, 6, 9, 16],
  amber: [0, 5, 14, 18, 23],
  cool: [1, 4, 7, 11, 15, 19, 20],
  any: [0, 1, 2, 3, 4, 5, 6, 11, 14, 17, 18, 22],
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
  const pool = SPLAT_FRAMES[tone]
  return (
    <Sprite
      sheet="splatSprite"
      index={pool[Math.abs(Math.floor(seed)) % pool.length]}
      width={width}
      className={className}
      style={style}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Correct-answer stickers: 5 x 4 sheet of 20 phrases                          */
/* -------------------------------------------------------------------------- */

/** Reads left-to-right, top-to-bottom, matching the sheet. */
export const STICKERS = [
  'Correct!', 'Yes!', "Let's go!", "That's right!", 'Good stuff!',
  'Correct', 'Nailed it!', 'You got it!', 'Perfect!', 'W!',
  'Big brain!', 'Sheesh!', 'Clean!', 'Valid!', 'Elite!',
  'Another one!', 'Dub!', 'On point!', 'That works!', 'Keep cookin!',
]

/**
 * Where a sticker may land. Zones are real boxes above and below the problem
 * card, so a sticker can never overlap the equation no matter how short the
 * viewport gets — percentages alone could not guarantee that.
 */
export const STICKER_ANCHORS = [
  { zone: 'top', side: 'left', rot: -7 },
  { zone: 'bottom', side: 'right', rot: 6 },
  { zone: 'bottom', side: 'left', rot: 5 },
  { zone: 'top', side: 'right', rot: -6 },
] as const

export function CorrectSticker({
  index,
  width = 'auto',
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
      sheet="positiveSprite"
      index={i}
      width={width}
      className={className}
      style={style}
      title={STICKERS[i]}
    />
  )
}

/** Reads left-to-right, top-to-bottom, matching incorrectSprite. */
export const MISS_STICKERS = [
  'Wrong!', 'Nope!', 'Nah!', 'Not quite!', 'Invalid!',
  'Try again!', 'Close but no!', 'Not it!', 'Oops!', 'No dice!',
  'Nice try!', 'No thanks!', 'Wrong answer!', 'Better luck next time!', 'Miss!',
  'Not correct!', "That's a no!", 'Nope!', 'Incorrect!', 'Wrong again!',
]

/**
 * The gentler half of the sheet, used by default. A seven-year-old who is
 * already slow at these facts does not need "WRONG AGAIN!" thrown at him; the
 * harsher frames stay available but are not what he sees.
 */
export const KIND_MISS_FRAMES = [3, 5, 6, 8, 10, 13, 2]

export function MissSticker({
  index,
  kindOnly = true,
  width = 'auto',
  className,
  style,
}: {
  index: number
  /** false uses all twenty frames, including the blunt ones. */
  kindOnly?: boolean
  width?: number | string
  className?: string
  style?: CSSProperties
}) {
  const i = Math.abs(Math.floor(index))
  const frame = kindOnly ? KIND_MISS_FRAMES[i % KIND_MISS_FRAMES.length] : i % 20
  return (
    <Sprite
      sheet="incorrectSprite"
      index={frame}
      width={width}
      className={className}
      style={style}
      title={MISS_STICKERS[frame]}
    />
  )
}

export const ART = {
  logo: `${IMG}/logo.webp`,
  world: `${IMG}/world.webp`,
  goober: `${IMG}/goober.webp`,
}

/* -------------------------------------------------------------------------- */
/* Level markers: the quest-node platforms on the map                          */
/* -------------------------------------------------------------------------- */

export type MarkerState = 'locked' | 'open' | 'current' | 'cleared' | 'mastered'

/** Frame index in levelMarkers, reading order across the loose sheet. */
const MARKER_FRAMES: Record<MarkerState, number> = {
  locked: 0, open: 1, current: 2, cleared: 3, mastered: 4,
}

/** Open and current have an empty ring for the quest number; the others don't. */
export const MARKER_HOLDS_NUMBER: Record<MarkerState, boolean> = {
  locked: false, open: true, current: true, cleared: false, mastered: false,
}

export function LevelMarker({
  state,
  width,
  className,
  style,
}: {
  state: MarkerState
  width: number | string
  className?: string
  style?: CSSProperties
}) {
  return <Sprite sheet="levelMarkers" index={MARKER_FRAMES[state]} width={width} className={className} style={style} />
}

/** One painted map per region; the MapScreen backdrop. */
export const REGION_ART: Record<Op, string> = {
  add: `${IMG}/plusPlains.webp`,
  sub: `${IMG}/minusMarsh.webp`,
  mul: `${IMG}/timesTundra.webp`,
  div: `${IMG}/dividedDesert.webp`,
}
