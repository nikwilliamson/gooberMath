import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { withVoiceStatus } from '@/stories/decorators'
import { VoiceChip } from '../components/VoiceChip'
import { Combo, Hud, Timer } from './Hud'

const meta = {
  title: 'Run/Hud',
  component: Hud,
  decorators: [
    (Story) => (
      <div className="run" style={{ width: 390, flex: 'none' }}>
        <Story />
      </div>
    ),
  ],
  args: { untimed: false, msLeft: 42_000, problemsLeft: 0, streak: 0, mult: 1, comboStep: 0, onQuit: fn() },
  argTypes: { msLeft: { control: { type: 'range', min: 0, max: 60_000, step: 500 } } },
} satisfies Meta<typeof Hud>

export default meta
type Story = StoryObj<typeof meta>

export const Fresh: Story = {}
export const Hot: Story = { args: { msLeft: 31_000, streak: 9, mult: 2, comboStep: 2 } }
export const Urgent: Story = { args: { msLeft: 6_500, streak: 14, mult: 3, comboStep: 3 } }
export const WarmUp: Story = { args: { untimed: true, problemsLeft: 7, streak: 3, mult: 1.5 } }

export const WithVoice: Story = {
  args: { msLeft: 31_000, streak: 4, mult: 1.5 },
  decorators: [withVoiceStatus({ mic: 'listening', level: 0.5 })],
  render: (args) => (
    <Hud {...args}>
      <VoiceChip />
    </Hud>
  ),
}

/** The bar alone at the three thresholds. */
export const TimerStates: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, width: 240 }}>
      {[55_000, 20_000, 4_000].map((ms) => (
        <div key={ms} className="hud__clock">
          <Timer msLeft={ms} />
        </div>
      ))}
    </div>
  ),
}

export const ComboStates: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 24 }}>
      <Combo streak={0} mult={1} step={0} />
      <Combo streak={3} mult={1.5} step={1} />
      <Combo streak={8} mult={2} step={2} />
      <Combo streak={15} mult={3} step={3} />
    </div>
  ),
}
