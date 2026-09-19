import type { CSSProperties } from 'react'

export type Mood = 'happy' | 'sad' | 'wow' | 'cheer'

/** Deterministic PRNG so every decorative shape is stable across renders. */
const prng = (seed: number) => {
  let t = seed * 9301 + 49297
  return () => ((t = (t * 9301 + 49297) % 233280) / 233280)
}

/* ========================================================================== */
/* Goober                                                                      */
/* ========================================================================== */

export function Goober({
  mood = 'happy',
  hue = 222,
  size = 120,
  className,
  style,
}: {
  mood?: Mood
  hue?: number
  size?: number
  className?: string
  style?: CSSProperties
}) {
  const body = `hsl(${hue} 82% 58%)`
  const bodyMid = `hsl(${hue} 76% 50%)`
  const bodyDark = `hsl(${hue} 70% 40%)`
  const armUp = mood === 'cheer'
  const eyeY = mood === 'sad' ? 80 : 76
  const id = `g${hue}-${mood}`

  return (
    <svg
      viewBox="0 0 140 178"
      width={size}
      height={(size * 178) / 140}
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <radialGradient id={id} cx="36%" cy="26%" r="78%">
          <stop offset="0%" stopColor={`hsl(${hue} 92% 72%)`} />
          <stop offset="62%" stopColor={body} />
          <stop offset="100%" stopColor={bodyDark} />
        </radialGradient>
      </defs>

      {/* legs, then shoes, so the shoes sit on the ends of the legs */}
      <path d="M56 138 L52 158 M84 138 L88 158" stroke={bodyMid} strokeWidth="13" strokeLinecap="round" />
      <ellipse cx="48" cy="164" rx="20" ry="10" fill="#f7f7fa" stroke="#16233d" strokeWidth="4" />
      <ellipse cx="92" cy="164" rx="20" ry="10" fill="#f7f7fa" stroke="#16233d" strokeWidth="4" />

      {/* arms: mitts on the ends so they do not read as antennae */}
      <path
        d={armUp ? 'M28 92 C14 80 10 62 14 48' : 'M28 96 C14 104 9 116 12 126'}
        stroke={bodyMid} strokeWidth="13" strokeLinecap="round" fill="none"
      />
      <path
        d={armUp ? 'M112 92 C126 80 130 62 126 48' : 'M112 96 C126 104 131 116 128 126'}
        stroke={bodyMid} strokeWidth="13" strokeLinecap="round" fill="none"
      />
      <circle cx={armUp ? 14 : 12} cy={armUp ? 46 : 128} r="10" fill={bodyMid} stroke="#16233d" strokeWidth="3.5" />
      <circle cx={armUp ? 126 : 128} cy={armUp ? 46 : 128} r="10" fill={bodyMid} stroke="#16233d" strokeWidth="3.5" />

      {/* body: a tall blob, heavier at the bottom */}
      <path
        d="M70 14 C108 14 126 44 123 86 C120 124 99 146 70 146 C41 146 20 124 17 86 C14 44 32 14 70 14 Z"
        fill={`url(#${id})`}
        stroke="#16233d"
        strokeWidth="4.5"
      />
      <ellipse cx="50" cy="48" rx="18" ry="12" fill="#fff" opacity="0.28" transform="rotate(-24 50 48)" />

      {/* cap: crown over the top, brim pointing back to the left */}
      <path
        d="M20 52 C22 26 42 12 70 12 C98 12 118 26 120 52 Z"
        fill="#ff9f3d" stroke="#16233d" strokeWidth="4.5" strokeLinejoin="round"
      />
      <path
        d="M20 52 C6 53 0 58 2 64 C5 70 15 66 26 60 Z"
        fill="#f2731f" stroke="#16233d" strokeWidth="4.5" strokeLinejoin="round"
      />
      <path d="M20 52 H120" stroke="#16233d" strokeWidth="4" />
      <circle cx="70" cy="12" r="6" fill="#ffd45e" stroke="#16233d" strokeWidth="3.5" />

      {/* eyes */}
      <ellipse cx="53" cy={eyeY} rx="16" ry="18" fill="#fff" stroke="#16233d" strokeWidth="4" />
      <ellipse cx="88" cy={eyeY} rx="16" ry="18" fill="#fff" stroke="#16233d" strokeWidth="4" />
      {mood === 'cheer' ? (
        <>
          <path d="M43 74 q10 -11 20 0" stroke="#16233d" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="89" cy={eyeY + 2} r="7.5" fill="#16233d" />
          <circle cx="92" cy={eyeY - 3} r="2.6" fill="#fff" />
        </>
      ) : (
        <>
          <circle cx="55" cy={eyeY + (mood === 'sad' ? 5 : 2)} r="7.5" fill="#16233d" />
          <circle cx="90" cy={eyeY + (mood === 'sad' ? 5 : 2)} r="7.5" fill="#16233d" />
          <circle cx="58" cy={eyeY + (mood === 'sad' ? 1 : -3)} r="2.6" fill="#fff" />
          <circle cx="93" cy={eyeY + (mood === 'sad' ? 1 : -3)} r="2.6" fill="#fff" />
        </>
      )}

      {/* mouth */}
      {mood === 'sad' ? (
        <path d="M56 116 q14 -12 28 0" stroke="#16233d" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      ) : mood === 'wow' ? (
        <ellipse cx="70" cy="112" rx="11" ry="14" fill="#7a1f3a" stroke="#16233d" strokeWidth="4" />
      ) : (
        <path
          d="M52 104 q18 26 36 0 z"
          fill="#7a1f3a" stroke="#16233d" strokeWidth="4" strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

/* ========================================================================== */
/* Ink splats                                                                  */
/* ========================================================================== */

/** Closed Catmull-Rom through polar points: organic, never a flower. */
function blobPath(seed: number, points = 11, base = 30, jitter = 22) {
  const rnd = prng(seed)
  const pts: Array<[number, number]> = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    const r = base + rnd() * jitter
    pts.push([60 + Math.cos(a) * r, 60 + Math.sin(a) * r])
  }
  const n = pts.length
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return `${d} Z`
}

export function Splat({
  color,
  size = 80,
  seed = 0,
  opacity = 1,
  style,
  className,
}: {
  color: string
  size?: number
  seed?: number
  opacity?: number
  style?: CSSProperties
  className?: string
}) {
  const rnd = prng(seed + 31)
  const drops = Array.from({ length: 5 }, () => {
    const a = rnd() * Math.PI * 2
    const dist = 46 + rnd() * 22
    return { cx: 60 + Math.cos(a) * dist, cy: 60 + Math.sin(a) * dist, r: 2.5 + rnd() * 6 }
  })
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={style} className={className} opacity={opacity} aria-hidden>
      <path d={blobPath(seed + 1)} fill={color} />
      {drops.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} />
      ))}
    </svg>
  )
}

export const INKS = ['#22d3ee', '#ff3ea5', '#a3e635', '#fb923c', '#a855f7', '#fde047', '#3ddc84']
/** Warm inks turn to mud over the dark arena, so it gets the cool set. */
export const ARENA_INKS = ['#22d3ee', '#ff3ea5', '#a855f7', '#3ddc84', '#60a5fa']

export function SplatField({
  count = 10,
  seed = 1,
  opacity = 0.5,
  palette = INKS,
}: {
  count?: number
  seed?: number
  opacity?: number
  palette?: string[]
}) {
  const rnd = prng(seed)
  return (
    <div className="scene__splats" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Splat
          key={i}
          seed={seed * 13 + i * 7}
          color={palette[Math.floor(rnd() * palette.length)]}
          size={70 + rnd() * 130}
          opacity={opacity}
          style={{
            position: 'absolute',
            left: `${rnd() * 100}%`,
            top: `${rnd() * 100}%`,
            transform: `translate(-50%,-50%) rotate(${rnd() * 360}deg)`,
          }}
        />
      ))}
    </div>
  )
}

/* ========================================================================== */
/* Scenery + badges                                                            */
/* ========================================================================== */

export function Cloud({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 200 90" className="cloud" style={style} aria-hidden>
      <g fill="#ffffff">
        <ellipse cx="60" cy="56" rx="44" ry="30" />
        <ellipse cx="104" cy="42" rx="38" ry="34" />
        <ellipse cx="144" cy="58" rx="36" ry="26" />
        <rect x="40" y="56" width="120" height="26" rx="13" />
      </g>
    </svg>
  )
}

function starPoints(spikes: number, outer: number, inner: number, cx = 60, cy = 60) {
  const pts: string[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI * i) / spikes - Math.PI / 2
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`)
  }
  return pts.join(' ')
}

export function Starburst({
  fill = '#f2731f',
  stroke = '#16233d',
  spikes = 13,
  className,
  style,
}: {
  fill?: string
  stroke?: string
  spikes?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} aria-hidden>
      <polygon points={starPoints(spikes, 58, 43)} fill={fill} stroke={stroke} strokeWidth="5" strokeLinejoin="round" />
    </svg>
  )
}

export function Rays({ className }: { className?: string }) {
  const wedges = Array.from({ length: 16 }, (_, i) => {
    const a0 = (i * Math.PI * 2) / 16
    const a1 = a0 + Math.PI / 16
    const R = 60
    return `M60,60 L${60 + Math.cos(a0) * R},${60 + Math.sin(a0) * R} L${60 + Math.cos(a1) * R},${60 + Math.sin(a1) * R} Z`
  })
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      {wedges.map((d, i) => (
        <path key={i} d={d} fill="rgba(255,214,96,0.5)" />
      ))}
    </svg>
  )
}
