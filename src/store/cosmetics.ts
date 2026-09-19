export interface Cosmetic {
  id: string
  kind: 'goober' | 'pad' | 'sound'
  name: string
  /** Level it unlocks at. 0 = owned from the start. */
  level: number
  /** Hue for the goober / pad tint. */
  hue?: number
}

export const COSMETICS: Cosmetic[] = [
  { id: 'goober-classic', kind: 'goober', name: 'Goober', level: 0, hue: 222 },
  { id: 'pad-ink', kind: 'pad', name: 'Ink Pad', level: 0 },
  { id: 'goober-lime', kind: 'goober', name: 'Limeling', level: 2, hue: 95 },
  { id: 'pad-chunk', kind: 'pad', name: 'Chunky Pad', level: 3 },
  { id: 'goober-magma', kind: 'goober', name: 'Magma Blob', level: 4, hue: 18 },
  { id: 'sound-arcade', kind: 'sound', name: 'Arcade Blips', level: 5 },
  { id: 'goober-violet', kind: 'goober', name: 'Violet Void', level: 6, hue: 280 },
  { id: 'pad-neon', kind: 'pad', name: 'Neon Pad', level: 7 },
  { id: 'sound-bell', kind: 'sound', name: 'Bell Tones', level: 8 },
  { id: 'goober-gold', kind: 'goober', name: 'Gold Goober', level: 10, hue: 45 },
]

export const XP_PER_LEVEL = (lvl: number) => 200 + lvl * 100

export function levelFromXp(xp: number) {
  let level = 1
  let rem = xp
  while (rem >= XP_PER_LEVEL(level)) {
    rem -= XP_PER_LEVEL(level)
    level++
  }
  return { level, into: rem, need: XP_PER_LEVEL(level) }
}

export const cosmeticsAt = (level: number) => COSMETICS.filter((c) => c.level > 0 && c.level <= level)
export const nextCosmetic = (level: number) =>
  COSMETICS.filter((c) => c.level > level).sort((a, b) => a.level - b.level)[0] ?? null
export const cosmeticById = (id: string) => COSMETICS.find((c) => c.id === id)
