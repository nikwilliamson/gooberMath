import type { Meta, StoryObj } from '@storybook/react-vite'
import { Countdown } from './Countdown'

const meta = {
  title: 'Run/Countdown',
  component: Countdown,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="app" style={{ minHeight: '100dvh' }}>
        <div className="run">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { count: 3, modeName: 'Sniper Mode', hint: 'Misses cost three seconds.' },
  argTypes: { count: { control: { type: 'range', min: 0, max: 3 } } },
} satisfies Meta<typeof Countdown>

export default meta
type Story = StoryObj<typeof meta>

export const Three: Story = {}
export const One: Story = { args: { count: 1 } }
export const Blitz: Story = { args: { count: 2, modeName: 'Blitz Mode', hint: 'Same facts. Faster you.' } }
export const WarmUp: Story = { args: { modeName: 'Warm-up' } }
/** A voice run holding at 3 while the mic opens. */
export const Waiting: Story = { args: { hint: 'Opening the mic…', waiting: true } }
