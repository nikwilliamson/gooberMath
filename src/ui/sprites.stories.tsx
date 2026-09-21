import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'
import {
  ART, CorrectSticker, GooberSprite, KIND_MISS_FRAMES, LEVEL_ART, LevelMarker, MISS_STICKERS, MissSticker,
  POSES, REGION_ART, STICKERS, Sprite, SplatImg, type MarkerState, type Pose, type SplatTone,
} from './sprites'
import frames from './spriteFrames.json'

const meta = {
  title: 'Foundations/Art',
  component: Sprite,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Sprite>

export default meta
type Story = StoryObj<typeof meta>

const grid = (min = 120): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
  gap: 16,
  width: '100%',
})

const caption: CSSProperties = {
  display: 'block',
  marginTop: 6,
  fontSize: 12,
  color: 'var(--dim)',
  textAlign: 'center',
}

/** The five sheets under public/img, every frame, with its index. */
export const Sheets: Story = {
  args: { sheet: 'gooberSprite', index: 0, width: 120 },
  render: () => (
    <div style={{ display: 'grid', gap: 32, width: '100%' }}>
      {Object.entries(frames).map(([sheet, data]) => (
        <section key={sheet}>
          <h3 style={{ margin: '0 0 12px', font: '700 14px/1 var(--font-ui)', letterSpacing: '0.08em' }}>
            {sheet} · {data.frames.length} frames · {data.width}×{data.height}
          </h3>
          <div style={grid(96)}>
            {data.frames.map((_, i) => (
              <figure key={i} style={{ margin: 0 }}>
                <Sprite sheet={sheet} index={i} width="100%" />
                <figcaption style={caption}>{i}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
}

/** All fifteen Goober poses, keyed by name. */
export const GooberPoses: Story = {
  args: { sheet: 'gooberSprite', index: 0, width: 120 },
  render: () => (
    <div style={grid(140)}>
      {(Object.keys(POSES) as Pose[]).map((pose) => (
        <figure key={pose} style={{ margin: 0 }}>
          <GooberSprite pose={pose} width="100%" title={pose} />
          <figcaption style={caption}>{pose}</figcaption>
        </figure>
      ))}
    </div>
  ),
}

/** The twenty correct-answer phrases in sheet order. */
export const CorrectStickers: Story = {
  args: { sheet: 'positiveSprite', index: 0, width: 120 },
  render: () => (
    <div style={grid(150)}>
      {STICKERS.map((phrase, i) => (
        <figure key={i} style={{ margin: 0 }}>
          <CorrectSticker index={i} width="100%" />
          <figcaption style={caption}>{i} · {phrase}</figcaption>
        </figure>
      ))}
    </div>
  ),
}

/** Miss stickers. The kind subset (default in the game) is marked; the rest are never shown to him. */
export const MissStickers: Story = {
  args: { sheet: 'incorrectSprite', index: 0, width: 120 },
  render: () => (
    <div style={grid(150)}>
      {MISS_STICKERS.map((phrase, i) => (
        <figure key={i} style={{ margin: 0 }}>
          <MissSticker index={i} kindOnly={false} width="100%" style={{ opacity: KIND_MISS_FRAMES.includes(i) ? 1 : 0.35 }} />
          <figcaption style={caption}>
            {i} · {phrase}
            {KIND_MISS_FRAMES.includes(i) ? ' · kind' : ''}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
}

/** Quest-node platforms by state. Open and current hold a number; the rest don't. */
export const LevelMarkers: Story = {
  args: { sheet: 'levelMarkers', index: 0, width: 120 },
  render: () => (
    <div style={grid(140)}>
      {(['locked', 'open', 'current', 'cleared', 'mastered'] as MarkerState[]).map((state) => (
        <figure key={state} style={{ margin: 0 }}>
          <LevelMarker state={state} width="100%" />
          <figcaption style={caption}>{state}</figcaption>
        </figure>
      ))}
    </div>
  ),
}

/** Splats grouped by tone; each tone's pool is what `seed` cycles through. */
export const Splats: Story = {
  args: { sheet: 'splatSprite', index: 0, width: 120 },
  render: () => (
    <div style={{ display: 'grid', gap: 24, width: '100%' }}>
      {(['good', 'bad', 'amber', 'cool', 'any'] as SplatTone[]).map((tone) => (
        <section key={tone}>
          <h3 style={{ margin: '0 0 8px', font: '700 12px/1 var(--font-ui)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>{tone}</h3>
          <div style={grid(90)}>
            {Array.from({ length: tone === 'any' ? 12 : 7 }, (_, seed) => (
              <SplatImg key={seed} tone={tone} seed={seed} width="100%" />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
}

/** The full-bleed paintings: title world, four region maps, four level backdrops. */
export const Backdrops: Story = {
  args: { sheet: 'gooberSprite', index: 0, width: 120 },
  render: () => {
    const all = {
      'title world': ART.world,
      ...Object.fromEntries(Object.entries(REGION_ART).map(([k, v]) => [`${k} map`, v])),
      ...Object.fromEntries(Object.entries(LEVEL_ART).map(([k, v]) => [`${k} level`, v])),
    }
    return (
      <div style={grid(260)}>
        {Object.entries(all).map(([name, src]) => (
          <figure key={name} style={{ margin: 0 }}>
            <img src={src} alt={name} style={{ width: '100%', display: 'block', borderRadius: 'var(--r-md)' }} />
            <figcaption style={caption}>{name}</figcaption>
          </figure>
        ))}
      </div>
    )
  },
}

/** Loose images: the wordmark and the title mascot. */
export const Logo: Story = {
  args: { sheet: 'gooberSprite', index: 0, width: 120 },
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
      <img src={ART.logo} alt="GooberMath" style={{ width: 320 }} />
      <img src={ART.goober} alt="The Goober" style={{ width: 200 }} />
    </div>
  ),
}
