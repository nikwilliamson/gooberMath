/**
 * Storybook stand-in for src/audio/engine.ts. Every method call shows up in
 * the Actions panel instead of making a sound, so a story can prove a tap
 * fired `audio.tap()` without an AudioContext ever being created.
 */
import { action } from 'storybook/actions'
import type { SoundPack } from '@/audio/engine'

export type { SoundPack }

const FIELDS: Record<string, unknown> = { intensity: 0, sfxEnabled: true }

export const audio = new Proxy(FIELDS, {
  get: (target, key) => {
    if (typeof key !== 'string') return undefined
    if (key in target) return target[key]
    return action(`audio.${key}`)
  },
  set: (target, key, value) => {
    if (typeof key === 'string') target[key] = value
    return true
  },
}) as unknown as typeof import('@/audio/engine').audio
