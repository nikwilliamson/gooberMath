export interface Cosmetic {
  id: string
  kind: 'goober' | 'pad' | 'sound'
  name: string
  /** Level it unlocks at. 0 = owned from the start. */
  level: number
  /** Body colour for the goober. Dark vinyl-toy tones, not bright hues. */
  tint?: string
}

export const COSMETICS: Cosmetic[] = [
  { id: 'goober-classic', kind: 'goober', name: 'Goober', level: 0, tint: '#1c2130' },
  { id: 'pad-ink', kind: 'pad', name: 'Goober Cap', level: 0 },
  { id: 'goober-slate', kind: 'goober', name: 'Slate', level: 2, tint: '#2a3142' },
  { id: 'pad-chunk', kind: 'pad', name: 'Field Cap', level: 3 },
  { id: 'goober-ember', kind: 'goober', name: 'Ember', level: 4, tint: '#3a2418' },
  { id: 'sound-arcade', kind: 'sound', name: 'Arcade Blips', level: 5 },
  { id: 'goober-void', kind: 'goober', name: 'Void', level: 6, tint: '#221a33' },
  { id: 'pad-neon', kind: 'pad', name: 'Night Cap', level: 7 },
  { id: 'sound-bell', kind: 'sound', name: 'Bell Tones', level: 8 },
  { id: 'goober-gold', kind: 'goober', name: 'Gilded', level: 10, tint: '#3a2f14' },
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
