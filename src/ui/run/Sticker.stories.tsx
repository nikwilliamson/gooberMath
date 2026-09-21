import type { Meta, StoryObj } from '@storybook/react-vite'
import { STICKER_ANCHORS } from '../sprites'
import { Sticker, StickerZone } from './Sticker'

const meta = {
  title: 'Run/Sticker',
  component: Sticker,
  decorators: [
    (Story) => (
      <div className="run" style={{ width: 390, height: 260, flex: 'none' }}>
        <div className="board">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { at: 1, index: 7, missed: false, points: 1_240, anchor: STICKER_ANCHORS[0] },
  argTypes: { anchor: { options: [0, 1, 2, 3], mapping: STICKER_ANCHORS, control: { type: 'select' } } },
} satisfies Meta<typeof Sticker>

export default meta
type Story = StoryObj<typeof meta>

export const Correct: Story = {}
export const Missed: Story = { args: { missed: true, index: 2 } }

/** All four anchors: two above the card, two below, alternating sides. */
export const Anchors: Story = {
  render: (args) => (
    <>
      <StickerZone zone="top" sticker={{ ...args, at: 1, index: 0, anchor: STICKER_ANCHORS[0] }} />
      <StickerZone zone="top" sticker={{ ...args, at: 2, index: 1, anchor: STICKER_ANCHORS[3] }} />
      <StickerZone zone="bottom" sticker={{ ...args, at: 3, index: 2, anchor: STICKER_ANCHORS[1] }} />
      <StickerZone zone="bottom" sticker={{ ...args, at: 4, index: 3, anchor: STICKER_ANCHORS[2] }} />
    </>
  ),
}
