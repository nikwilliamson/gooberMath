import type { Meta, StoryObj } from '@storybook/react-vite'
import { withVoiceStatus } from '@/stories/decorators'
import { VoiceChip, VoiceNudge } from './VoiceChip'

const meta = {
  title: 'Components/VoiceChip',
  component: VoiceChip,
  decorators: [
    (Story) => (
      <div className="hud" style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VoiceChip>

export default meta
type Story = StoryObj<typeof meta>

export const Opening: Story = { decorators: [withVoiceStatus({ mic: 'opening' })] }
export const Listening: Story = { decorators: [withVoiceStatus({ mic: 'listening', level: 0.1 })] }
export const ListeningLoud: Story = { decorators: [withVoiceStatus({ mic: 'listening', level: 0.9 })] }
export const Denied: Story = { decorators: [withVoiceStatus({ mic: 'denied' })] }
export const Error: Story = { decorators: [withVoiceStatus({ mic: 'error' })] }

/** "Say it again", shown under the problem for 1.4s after an unsure hearing. */
export const Nudge: Story = {
  decorators: [withVoiceStatus({ mic: 'listening', unsureAt: performance.now() })],
  render: () => (
    <div className="panel problemcard" style={{ width: 320, padding: 24 }}>
      <VoiceNudge />
      <span className="problem tnum">7 + 8 = ?</span>
    </div>
  ),
}
