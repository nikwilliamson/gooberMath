import type { Meta, StoryObj } from '@storybook/react-vite'
import { withAppRoot, withGame, withVoiceStatus } from '@/stories/decorators'
import { runs, saves } from '@/stories/fixtures'
import type { SaveData } from '@/store/types'
import { RunScreen } from './RunScreen'

/**
 * The real RunScreen over a seeded run. The countdown runs for real (2.1s)
 * before the seeded state shows, and the clock ticks live after that: the
 * pad, keyboard and the held-reveal tap all go through the real reducer.
 * Music is off so the stubbed engine is never asked to start the track.
 */
const quiet = (): SaveData => {
  const s = saves.midway()
  return { ...s, settings: { ...s.settings, music: false } }
}

const meta = {
  title: 'Screens/Run',
  component: RunScreen,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
} satisfies Meta<typeof RunScreen>

export default meta
type Story = StoryObj<typeof meta>

/** Three, two, one. */
export const Countdown: Story = { decorators: [withGame({ save: quiet(), run: runs.start() })] }

/** Mid-run with a streak going and the multiplier lit. */
export const Streak: Story = { decorators: [withGame({ save: quiet(), run: runs.streak() })] }

/** One digit of a two-digit answer typed. */
export const PartialEntry: Story = { decorators: [withGame({ save: quiet(), run: runs.partialEntry() })] }

/** The held wrong-answer reveal; the clock is paused until he taps. */
export const HeldWrong: Story = { decorators: [withGame({ save: quiet(), run: runs.heldWrong() })] }

/** Under ten seconds: urgent timer. */
export const LastTenSeconds: Story = { decorators: [withGame({ save: quiet(), run: runs.lastTen() })] }

/** Warm-up: no clock, problems left instead. */
export const Untimed: Story = { decorators: [withGame({ save: quiet(), run: runs.untimed() })] }

/** Blitz mode copy on the countdown and corner. */
export const Blitz: Story = { decorators: [withGame({ save: quiet(), run: runs.streak({ mode: 'blitz' }) })] }

/** Voice run: mic chip in the HUD, listening. */
export const Voice: Story = {
  decorators: [
    withGame({ save: quiet(), run: runs.voice() }),
    withVoiceStatus({ model: 'ready', mic: 'listening', level: 0.6 }),
  ],
}

/** Each region paints the run differently. */
export const MinusMarsh: Story = { decorators: [withGame({ save: quiet(), run: runs.streak({ questId: 'sub-3' }) })] }
export const TimesTundra: Story = { decorators: [withGame({ save: quiet(), run: runs.streak({ questId: 'mul-2' }) })] }
export const DividedDesert: Story = { decorators: [withGame({ save: quiet(), run: runs.streak({ questId: 'div-1' }) })] }
