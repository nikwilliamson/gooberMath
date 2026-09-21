import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { withAppRoot, withGame, withVoiceStatus } from '@/stories/decorators'
import { saves } from '@/stories/fixtures'
import { MapScreen } from './MapScreen'

/**
 * The real MapScreen over a seeded save. Region tabs, quest selection and
 * the Play buttons all drive the real store, so `begin` fires as an action
 * (and, in Storybook, goes nowhere: App is what switches screens).
 */
const meta = {
  title: 'Screens/Map',
  component: MapScreen,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
  args: { onSettings: fn() },
} satisfies Meta<typeof MapScreen>

export default meta
type Story = StoryObj<typeof meta>

/** First launch: everything locked past the first quest of each region. */
export const Fresh: Story = { decorators: [withGame({ save: saves.fresh(), screen: 'map' })] }

/** A few weeks in: Plus Plains mostly cleared, a voice best on one quest. */
export const Midway: Story = { decorators: [withGame({ save: saves.midway(), screen: 'map' })] }

/** Everything cleared and mastered. */
export const Mastered: Story = { decorators: [withGame({ save: saves.mastered(), screen: 'map' })] }

/** Voice switched on and the model ready. */
export const VoiceReady: Story = {
  decorators: [
    withGame({ save: { ...saves.midway(), settings: { ...saves.midway().settings, voice: true } }, screen: 'map' }),
    withVoiceStatus({ model: 'ready' }),
  ],
}

/** Voice switched on, model still downloading. */
export const VoiceLoading: Story = {
  decorators: [
    withGame({ save: { ...saves.midway(), settings: { ...saves.midway().settings, voice: true } }, screen: 'map' }),
    withVoiceStatus({ model: 'loading' }),
  ],
}

/** Mic blocked in browser settings. */
export const VoiceDenied: Story = {
  decorators: [withGame({ save: saves.midway(), screen: 'map' }), withVoiceStatus({ mic: 'denied' })],
}
