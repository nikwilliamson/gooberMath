import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'
import { COSMETICS } from '@/store/cosmetics'
import { Crown, Goober, GooberCap, OP_ACCENT, RoughText, SplatBurst, SplatField, type Mood } from './art'

const meta = {
  title: 'Foundations/Art Helpers',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta

const row: CSSProperties = { display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }
const caption: CSSProperties = { display: 'block', marginTop: 6, fontSize: 12, color: 'var(--dim)', textAlign: 'center' }

/** Turbulence-displaced display type, used where there is no lettering art. */
export const RoughTextStory: StoryObj<typeof RoughText> = {
  name: 'RoughText',
  render: (args) => <RoughText {...args} />,
  args: { text: 'Quest Clear', size: 96, color: '#f5b21f', seed: 3, roughness: 1 },
  argTypes: {
    roughness: { control: { type: 'range', min: 0, max: 3, step: 0.1 } },
    size: { control: { type: 'range', min: 24, max: 200, step: 4 } },
    color: { control: 'color' },
  },
}

/** The mascot by mood, and by cosmetic tint (a hue shift of the accents). */
export const GooberMoods: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={row}>
        {(['idle', 'sad', 'cheer'] as Mood[]).map((mood) => (
          <figure key={mood} style={{ margin: 0 }}>
            <Goober mood={mood} size={130} />
            <figcaption style={caption}>{mood}</figcaption>
          </figure>
        ))}
      </div>
      <div style={row}>
        {COSMETICS.filter((c) => c.kind === 'goober').map((c) => (
          <figure key={c.id} style={{ margin: 0 }}>
            <Goober mood="cheer" tint={c.tint} size={110} />
            <figcaption style={caption}>{c.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  ),
}

/** Cap and crown glyphs; the crown follows `--amber` unless given a colour. */
export const Glyphs: StoryObj = {
  render: () => (
    <div style={row}>
      <figure style={{ margin: 0 }}>
        <GooberCap size={160} />
        <figcaption style={caption}>GooberCap</figcaption>
      </figure>
      {Object.entries(OP_ACCENT).map(([op, color]) => (
        <figure key={op} style={{ margin: 0 }}>
          <Crown size={56} color={color} />
          <figcaption style={caption}>Crown · {op}</figcaption>
        </figure>
      ))}
    </div>
  ),
}

/** `SplatBurst` picks a splat tone from the colour it is asked for. */
export const Bursts: StoryObj = {
  render: () => (
    <div style={row}>
      {['#6ee05f', '#ff4d5e', '#f5b21f', '#35d6ef'].map((color) => (
        <figure key={color} style={{ margin: 0, width: 140 }}>
          <SplatBurst color={color} seed={2} />
          <figcaption style={caption}>{color}</figcaption>
        </figure>
      ))}
    </div>
  ),
}

/** Page-texture splats scattered by seed. */
export const Field: StoryObj<typeof SplatField> = {
  render: (args) => (
    <div style={{ position: 'relative', width: 360, height: 360, background: 'var(--bg-2)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <SplatField {...args} />
    </div>
  ),
  args: { count: 5, seed: 1, color: '#f5b21f', opacity: 0.12 },
  argTypes: { opacity: { control: { type: 'range', min: 0, max: 1, step: 0.02 } } },
}
