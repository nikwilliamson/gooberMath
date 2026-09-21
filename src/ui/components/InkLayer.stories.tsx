import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { InkLayer } from './InkLayer'

const meta = {
  title: 'Components/InkLayer',
  component: InkLayer,
  parameters: { layout: 'fullscreen' },
  args: { pulse: 0, enabled: true, intensity: 1 },
  argTypes: { intensity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } } },
} satisfies Meta<typeof InkLayer>

export default meta
type Story = StoryObj<typeof meta>

/** Each tap bumps `pulse`, which is all the run does to fire a burst. */
export const Bursts: Story = {
  render: (args) => {
    const [pulse, setPulse] = useState(0)
    return (
      <div style={{ position: 'relative', width: '100%', height: '100dvh', display: 'grid', placeItems: 'center' }}>
        <InkLayer {...args} pulse={pulse} />
        <button className="btn btn--amber" style={{ position: 'relative', zIndex: 2 }} onClick={() => setPulse((p) => p + 1)}>
          Correct answer
        </button>
      </div>
    )
  },
}
