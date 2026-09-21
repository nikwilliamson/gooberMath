import type { Meta, StoryObj } from '@storybook/react-vite'
import { withVoiceStatus } from '@/stories/decorators'
import { VoiceNudge } from '../components/VoiceChip'
import { ProblemCard } from './ProblemCard'

const meta = {
  title: 'Run/ProblemCard',
  component: ProblemCard,
  decorators: [
    (Story) => (
      <div className="run" style={{ width: 390, flex: 'none' }}>
        <div className="board">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { factKey: 'add:7+8', left: '7 + 8', slots: ['', ''], glow: 0, dim: false },
} satisfies Meta<typeof ProblemCard>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const OneDigit: Story = { args: { factKey: 'add:3+4', left: '3 + 4', slots: [''] } }
export const HalfTyped: Story = { args: { slots: ['1', ''] } }
export const Answered: Story = { args: { slots: ['1', '5'] } }
export const Glowing: Story = { args: { slots: ['1', '5'], glow: 2 } }
/** Behind the wrong-answer reveal. The card is faded on purpose, so contrast is not checked here. */
export const Dimmed: Story = {
  args: { slots: ['1', '4'], dim: true },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
}

/** The old question leaving as the new one arrives (a frozen frame of the 320ms swap). */
export const Swapping: Story = {
  args: { factKey: 'add:9+6', left: '9 + 6', slots: ['', ''], leaving: { key: 'add:7+8', left: '7 + 8 = ', answer: '15', won: true } },
}

export const WithNudge: Story = {
  decorators: [withVoiceStatus({ mic: 'listening', unsureAt: performance.now() })],
  render: (args) => (
    <ProblemCard {...args}>
      <VoiceNudge />
    </ProblemCard>
  ),
}
