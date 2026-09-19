import type { CSSProperties } from 'react'
import { GooberSprite, SplatImg, type Pose, type SplatTone } from './sprites'

export type Mood = 'idle' | 'sad' | 'cheer'

const prng = (seed: number) => {
  let t = seed * 9301 + 49297
  return () => ((t = (t * 9301 + 49297) % 233280) / 233280)
}

const DISPLAY_STACK =
  "'Inter Tight','SF Pro Display',system-ui,-apple-system,'Segoe UI',sans-serif"

/* ========================================================================== */
/* Brush-textured display type                                                 */
/* ========================================================================== */

/**
 * No brush webfont is reachable from this environment, so the painted edge is
 * made with turbulence + displacement over heavy italic text. Swap this whole
 * component for real lettering art when there is some.
 */
export function RoughText({
  text,
  size = 96,
  color = '#fff',
  seed = 3,
  roughness = 1,
  className,
  style,
}: {
  text: string
  size?: number
  color?: string
  seed?: number
  roughness?: number
  className?: string
  style?: CSSProperties
}) {
  const w = Math.max(1, text.length) * size * 0.64
  const h = size * 1.32
  const fid = `rt-${seed}-${text.length}-${Math.round(size)}`
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ width: '100%', maxWidth: w, height: 'auto', overflow: 'visible', ...style }}
      role="img"
      aria-label={text}
    >
      <defs>
        <filter id={fid} x="-15%" y="-30%" width="130%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.07" numOctaves="3" seed={seed} result="n" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale={size * 0.055 * roughness}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <text
        x={w / 2}
        y={size}
        textAnchor="middle"
        fontFamily={DISPLAY_STACK}
        fontSize={size}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing={-size * 0.03}
        fill={color}
        filter={`url(#${fid})`}
      >
        {text}
      </text>
    </svg>
  )
}

/* ========================================================================== */
/* Paint splatter                                                              */
/* ========================================================================== */

const toneFor = (color: string): SplatTone => {
  const c = color.toLowerCase()
  if (c.includes('6ee0') || c.includes('3ddc') || c.includes('a8f5')) return 'good'
  if (c.includes('ff4d') || c.includes('7a10') || c.includes('ff8a')) return 'bad'
  if (c.includes('f5b2') || c.includes('ffcd')) return 'amber'
  return 'cool'
}

/** Kept the old name and props; the paint is now real art from the sheet. */
export function SplatBurst({
  color,
  seed = 1,
  className,
  style,
}: {
  color: string
  color2?: string
  seed?: number
  density?: number
  className?: string
  style?: CSSProperties
}) {
  return <SplatImg tone={toneFor(color)} seed={seed} className={className} style={style} />
}

/** Sparse splatter used as page texture. */
export function SplatField({
  count = 5,
  seed = 1,
  color = '#f5b21f',
  opacity = 0.12,
}: {
  count?: number
  seed?: number
  color?: string
  opacity?: number
}) {
  const rnd = prng(seed)
  const tone = toneFor(color)
  return (
    <div className="scene__splats" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <SplatImg
          key={i}
          tone={tone}
          seed={seed * 5 + i * 11}
          width={`${20 + rnd() * 26}%`}
          style={{
            position: 'absolute',
            left: `${rnd() * 100}%`,
            top: `${rnd() * 100}%`,
            transform: `translate(-50%,-50%) rotate(${rnd() * 360}deg)`,
            opacity,
          }}
        />
      ))}
    </div>
  )
}

/* ========================================================================== */
/* Goober: dark vinyl-toy mascot, capped, crowned                              */
/* ========================================================================== */

const MOOD_POSE: Record<Mood, Pose> = { idle: 'idle', sad: 'sad', cheer: 'cheer' }

/**
 * Wraps the pose sheet behind the old signature. `tint` no longer recolours a
 * drawn body — it hue-shifts the character's amber accents so the cosmetic
 * skins still read as different.
 */
export function Goober({
  mood = 'idle',
  tint,
  size = 130,
  className,
  style,
}: {
  mood?: Mood
  tint?: string
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <GooberSprite
      pose={MOOD_POSE[mood]}
      width={size}
      className={className}
      style={tint ? { filter: TINT_FILTER[tint] ?? undefined, ...style } : style}
    />
  )
}

/** Cosmetic tints, as accent hue shifts rather than body colours. */
const TINT_FILTER: Record<string, string> = {
  '#1c2130': '',
  '#2a3142': 'hue-rotate(-28deg) saturate(0.7)',
  '#3a2418': 'hue-rotate(-38deg) saturate(1.35)',
  '#221a33': 'hue-rotate(96deg) saturate(1.1)',
  '#3a2f14': 'brightness(1.18) saturate(1.3)',
}

/** Just the cap, for the countdown and reward screens. */
export function GooberCap({ size = 160, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={(size * 110) / 160} className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id="capg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#252b3a" />
          <stop offset="100%" stopColor="#0d1017" />
        </linearGradient>
      </defs>
      <path d="M24 74 C26 34 48 14 80 14 C112 14 134 34 136 74 Z" fill="url(#capg)" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <path d="M132 74 c16 1 26 5 26 12 c0 6-14 8-32 8 l-22 0 z" fill="#0d1017" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <path d="M80 14 v60" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <path d="M64 56 l5-13 l6 8 l5-13 l5 13 l6-8 l5 13 z" fill="var(--amber, #f5b21f)" />
    </svg>
  )
}

export const OP_ACCENT: Record<string, string> = {
  add: '#f5b21f',
  sub: '#e6ebf5',
  mul: '#b06bff',
  div: '#35d6ef',
}

export function Crown({ size = 40, color = 'var(--amber, #f5b21f)', className, style }: { size?: number; color?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 34" width={size} height={(size * 34) / 60} className={className} style={style} aria-hidden>
      <path d="M6 30 L2 6 l14 10 L30 2 l14 14 L58 6 l-4 24 z" fill={color} />
    </svg>
  )
}
