import type { Decorator } from '@storybook/react-vite'
import { useLayoutEffect, useState } from 'react'
import { questById } from '@/engine/quests'
import type { RunState, RunSummary } from '@/engine/run'
import { useGame, type Awards, type Screen } from '@/store/game'
import { DEFAULT_SAVE, type SaveData } from '@/store/types'
import { useVoiceStatus } from '@/voice/status'

type GameState = ReturnType<typeof useGame.getState>

export interface GameSeed {
  save?: SaveData
  screen?: Screen
  /** A run state. The store's private run context is rebuilt via `begin()`
      so `digit` / `tick` / `advance` keep working in the story. */
  run?: RunState
  summary?: RunSummary
  awards?: Awards
}

/**
 * Seeds the real zustand store before the story renders. There is no mocked
 * store: the screens read `useGame` exactly as they do in the app, and the
 * story's actions (tapping the pad, opening a sheet) drive the real reducer.
 */
export const withGame = (seed: GameSeed | (() => GameSeed) = {}): Decorator =>
  function WithGame(Story) {
    // Seeded in a state initialiser: once, and before the story's first render
    // so its selectors never see the previous story's state.
    useState(() => seedGame(typeof seed === 'function' ? seed() : seed))
    // Reset after unmount too, so the next story never inherits a run.
    useLayoutEffect(() => () => seedGame({}), [])
    return <Story />
  }

function seedGame(seed: GameSeed) {
  const base: Partial<GameState> = {
    ready: true,
    save: seed.save ?? DEFAULT_SAVE,
    screen: seed.screen ?? 'title',
    run: null,
    summary: seed.summary ?? null,
    awards: seed.awards ?? null,
    activeQuestId: null,
    pulse: 0,
  }
  useGame.setState(base)
  if (!seed.run) return
  const q = questById(seed.run.questId)
  if (!q) throw new Error(`Fixture run names unknown quest ${seed.run.questId}`)
  // begin() is what builds the module-private RunCtx the actions need.
  useGame.getState().begin(q.id, seed.run.mode, seed.run.untimed)
  useGame.setState({ run: seed.run, screen: seed.screen ?? 'run', activeQuestId: q.id })
}

type VoiceState = Omit<ReturnType<typeof useVoiceStatus.getState>, 'set'>

/** Seeds the voice status store (mic, model, level). */
export const withVoiceStatus = (patch: Partial<VoiceState>): Decorator =>
  function WithVoiceStatus(Story) {
    useState(() => useVoiceStatus.setState({ model: 'idle', mic: 'off', level: 0, unsureAt: 0, error: null, ...patch }))
    useLayoutEffect(
      () => () => useVoiceStatus.setState({ model: 'idle', mic: 'off', level: 0, unsureAt: 0, error: null }),
      [],
    )
    return <Story />
  }

/**
 * A full-height flex column, the way #root is laid out in index.html, so a
 * screen story fills the viewport exactly as the app does.
 */
export const withAppRoot: Decorator = (Story) => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', width: '100%' }}>
    <Story />
  </div>
)
