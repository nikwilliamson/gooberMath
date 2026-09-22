import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { withAppRoot } from '@/stories/decorators'
import { VOICE_TIPS, VoiceGateView } from './VoiceGateView'

const meta = {
  title: 'Components/VoiceGate',
  component: VoiceGateView,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
  args: { eyebrow: 'Getting voice ready', lines: VOICE_TIPS, onSkip: null },
} satisfies Meta<typeof VoiceGateView>

export default meta
type Story = StoryObj<typeof meta>

/** The cached model loading: a second or two, tips rotating. */
export const Loading: Story = {}
/** The first load on a device, which is a download. */
export const Downloading: Story = { args: { eyebrow: 'Downloading voice', lines: ['One-time download. Hang tight.', ...VOICE_TIPS] } }
/** A slow download offers a way out. */
export const Slow: Story = { args: { eyebrow: 'Downloading voice', lines: ['One-time download. Hang tight.', ...VOICE_TIPS], onSkip: fn() } }
/** The permission prompt is up (iOS draws its own sheet over this). */
export const Priming: Story = { args: { eyebrow: 'Microphone', lines: ['Tap Allow so it can hear you.'] } }
/** The longest tip, for the held height. */
export const LongestTip: Story = { args: { lines: [VOICE_TIPS.reduce((a, b) => (b.length > a.length ? b : a))] } }
