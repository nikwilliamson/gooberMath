import type { CSSProperties } from 'react'

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

function blobPath(seed: number, points = 12, base = 26, jitter = 24) {
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

/** A thrown-paint burst: irregular lobes plus flecks stretched along their throw. */
export function SplatBurst({
  color,
  color2,
  seed = 1,
  density = 1,
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
  const rnd = prng(seed)
  const pick = (c2?: string) => (c2 && rnd() > 0.62 ? c2 : color)

  const lobes = Array.from({ length: Math.round(5 * density) }, (_, i) => ({
    // High jitter relative to base is what keeps a lobe from reading as a disc.
    d: blobPath(seed * 7 + i * 13, 13, 10 + rnd() * 14, 20 + rnd() * 22),
    x: (rnd() - 0.5) * 60,
    y: (rnd() - 0.5) * 40,
    s: 0.45 + rnd() * 0.9,
    rot: rnd() * 360,
    c: pick(color2),
  }))

  const flecks = Array.from({ length: Math.round(44 * density) }, () => {
    const a = rnd() * Math.PI * 2
    const dist = 26 + rnd() * 62
    const r = 0.7 + rnd() * 3
    return {
      cx: 60 + Math.cos(a) * dist * 1.35,
      cy: 60 + Math.sin(a) * dist * 0.85,
      // Stretched along the throw direction so it reads as motion, not bubbles.
      rx: r * (1 + dist / 46),
      ry: r,
      rot: (a * 180) / Math.PI,
      o: 0.45 + rnd() * 0.55,
      c: pick(color2),
    }
  })

  return (
    <svg viewBox="-40 0 200 120" className={className} style={style} aria-hidden>
      {lobes.map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill={l.c}
          transform={`translate(${l.x} ${l.y}) rotate(${l.rot} 60 60) scale(${l.s})`}
          style={{ transformOrigin: '60px 60px' }}
        />
      ))}
      {flecks.map((f, i) => (
        <ellipse
          key={`f${i}`}
          cx={f.cx}
          cy={f.cy}
          rx={f.rx}
          ry={f.ry}
          fill={f.c}
          opacity={f.o}
          transform={`rotate(${f.rot} ${f.cx} ${f.cy})`}
        />
      ))}
    </svg>
  )
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
  return (
    <div className="scene__splats" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <SplatBurst
          key={i}
          color={color}
          seed={seed * 5 + i * 11}
          density={0.7}
          style={{
            position: 'absolute',
            width: `${28 + rnd() * 40}%`,
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

export function Goober({
  mood = 'idle',
  tint = '#1c2130',
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
  const cheer = mood === 'cheer'
  const id = tint.replace('#', '')
  const cap = '#0f131d'
  // A bright rim on the light side is what stops a dark character reading flat.
  const rim = 'rgba(190,210,255,0.55)'
  const rimSoft = 'rgba(160,185,235,0.22)'
  const eyeY = mood === 'sad' ? 78 : 74
  const eyeRy = mood === 'sad' ? 7.5 : 12.5

  return (
    <svg
      viewBox="0 0 150 182"
      width={size}
      height={(size * 182) / 150}
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id={`body-${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
        </linearGradient>
        <linearGradient id={`cap-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </linearGradient>
      </defs>

      {/* shoes with visible soles */}
      <path d="M40 152 h24 a6 6 0 0 1 6 6 v4 a4 4 0 0 1-4 4 H37 a6 6 0 0 1-6-6 v-2 a6 6 0 0 1 9-6z" fill="#0c1018" stroke={rimSoft} strokeWidth="1.6" />
      <path d="M86 152 h24 a6 6 0 0 1 9 6 v2 a6 6 0 0 1-6 6 H86 a4 4 0 0 1-4-4 v-4 a6 6 0 0 1 4-6z" fill="#0c1018" stroke={rimSoft} strokeWidth="1.6" />
      <path d="M31 164.5 h39 M82 164.5 h37" stroke="#e8edf8" strokeWidth="3" strokeLinecap="round" />

      {/* legs */}
      <path d="M62 132 v22 M90 132 v22" stroke={tint} strokeWidth="17" strokeLinecap="round" />
      <path d="M62 132 v22" stroke={rimSoft} strokeWidth="1.5" />

      {/* arms */}
      <path
        d={cheer ? 'M36 100 C20 90 15 68 22 50' : 'M36 102 C23 110 19 122 23 132'}
        stroke={tint} strokeWidth="16" strokeLinecap="round" fill="none"
      />
      <path
        d={cheer ? 'M114 100 C130 92 136 76 134 62' : 'M114 102 C127 110 131 122 127 132'}
        stroke={tint} strokeWidth="16" strokeLinecap="round" fill="none"
      />

      {/* torso: chunky, gradient-shaded */}
      <path
        d="M75 86 c25 0 37 13 37 30 v12 c0 11-16 16-37 16 s-37-5-37-16 v-12 c0-17 12-30 37-30z"
        fill={tint}
      />
      <path
        d="M75 86 c25 0 37 13 37 30 v12 c0 11-16 16-37 16 s-37-5-37-16 v-12 c0-17 12-30 37-30z"
        fill={`url(#body-${id})`} stroke={rimSoft} strokeWidth="1.8"
      />
      <path d="M45 96 C40 106 38 116 38 128" stroke={rim} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />

      {/* head */}
      <rect x="33" y="34" width="84" height="64" rx="27" fill={tint} />
      <rect x="33" y="34" width="84" height="64" rx="27" fill={`url(#body-${id})`} stroke={rimSoft} strokeWidth="1.8" />

      {/* cap */}
      <path d="M33 60 C34 35 50 22 75 22 C100 22 116 35 117 60 Z" fill={cap} />
      <path d="M33 60 C34 35 50 22 75 22 C100 22 116 35 117 60 Z" fill={`url(#cap-${id})`} stroke={rimSoft} strokeWidth="1.8" />
      <path d="M113 60 c17 0 28 4 28 10 c0 5-12 7-28 7 l-14 0 z" fill={cap} stroke={rimSoft} strokeWidth="1.8" />
      <path d="M50 30 C58 25 66 23 75 23" stroke={rim} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M33 60 H117" stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" />
      <path d="M61 46 l5-11 l6 7 l3-11 l3 11 l6-7 l5 11 z" fill="var(--amber, #f5b21f)" />

      {/* eyes */}
      <ellipse cx="60" cy={eyeY} rx="9.5" ry={eyeRy} fill="#fff" />
      <ellipse cx="90" cy={eyeY} rx="9.5" ry={eyeRy} fill="#fff" />
    </svg>
  )
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
