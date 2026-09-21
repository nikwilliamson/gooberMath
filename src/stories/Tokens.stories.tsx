import type { Meta, StoryObj } from '@storybook/react-vite'
import { useLayoutEffect, useState, type CSSProperties } from 'react'

/**
 * Swatches read straight from the stylesheet at render time, so this page
 * cannot drift from theme.css: change a token there and it changes here.
 */

const meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta

const COLOR_GROUPS: Record<string, string[]> = {
  Surfaces: ['--bg', '--bg-2', '--bg-3', '--panel', '--panel-2', '--line', '--line-2'],
  Text: ['--text', '--dim', '--dimmer'],
  Amber: ['--amber', '--amber-hi', '--amber-deep'],
  Feedback: ['--green', '--green-hi', '--red', '--red-hi'],
  Regions: ['--op-add', '--op-sub', '--op-mul', '--op-div', '--ink'],
}

const RADII = ['--r-sm', '--r-md', '--r-lg', '--r-pill']
const DURATIONS = ['--dur-micro', '--dur-state', '--dur-enter', '--dur-celebrate']
const EASES = ['--ease-out', '--ease-in', '--ease-snap', '--ease-spring']

const useTokens = (names: string[]) => {
  const [values, setValues] = useState<Record<string, string>>({})
  useLayoutEffect(() => {
    const cs = getComputedStyle(document.documentElement)
    setValues(Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return values
}

const mono: CSSProperties = { font: '500 12px/1.4 ui-monospace, monospace', color: 'var(--dim)' }
const h: CSSProperties = { margin: '0 0 12px', font: '700 12px/1 var(--font-ui)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)' }

export const Colors: StoryObj = {
  render: () => {
    const values = useTokens(Object.values(COLOR_GROUPS).flat())
    return (
      <div style={{ display: 'grid', gap: 28, width: '100%' }}>
        {Object.entries(COLOR_GROUPS).map(([group, names]) => (
          <section key={group}>
            <h3 style={h}>{group}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {names.map((name) => (
                <div key={name} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  <div style={{ height: 64, background: `var(${name})` }} />
                  <div style={{ padding: 10 }}>
                    <div style={{ font: '700 13px/1.3 var(--font-ui)' }}>{name}</div>
                    <div style={mono}>{values[name]}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  },
}

export const Radii: StoryObj = {
  render: () => {
    const values = useTokens(RADII)
    return (
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {RADII.map((name) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div style={{ width: 96, height: 64, background: 'var(--panel-2)', border: '1px solid var(--line-2)', borderRadius: `var(${name})` }} />
            <div style={{ marginTop: 8, font: '700 13px/1.3 var(--font-ui)' }}>{name}</div>
            <div style={mono}>{values[name]}</div>
          </div>
        ))}
      </div>
    )
  },
}

/** Four durations, four curves, nothing outside them. Hover a bar to see it move. */
export const Motion: StoryObj = {
  render: () => {
    const values = useTokens([...DURATIONS, ...EASES])
    return (
      <div style={{ display: 'grid', gap: 28, width: '100%', maxWidth: 560 }}>
        <section>
          <h3 style={h}>Durations</h3>
          {DURATIONS.map((name) => (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 70px', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ font: '700 13px/1 var(--font-ui)' }}>{name}</span>
              <span style={{ height: 8, borderRadius: 999, background: 'var(--amber)', width: `calc(${values[name] || '0ms'} / 500ms * 100%)` }} />
              <span style={mono}>{values[name]}</span>
            </div>
          ))}
        </section>
        <section>
          <h3 style={h}>Easing</h3>
          <style>{`.tok-ease:hover .tok-ease__dot { transform: translateX(200px); }`}</style>
          {EASES.map((name) => (
            <div key={name} className="tok-ease" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ font: '700 13px/1 var(--font-ui)' }}>{name}</span>
              <div style={{ position: 'relative', height: 20 }}>
                <span
                  className="tok-ease__dot"
                  style={{ position: 'absolute', left: 0, top: 2, width: 16, height: 16, borderRadius: 999, background: 'var(--ink)', transition: `transform var(--dur-celebrate) var(${name})` }}
                />
                <span style={{ ...mono, position: 'absolute', right: 0, top: 3 }}>{values[name]}</span>
              </div>
            </div>
          ))}
        </section>
      </div>
    )
  },
}

/** The utility classes the screens compose: label, tnum, chip, pill, panel, btn. */
export const Type: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 20, maxWidth: 520 }}>
      <div>
        <div style={h}>--font-ui (obviously, 400 and 700 only)</div>
        <p style={{ margin: 0, fontSize: 18 }}>Practice today. Bigger tomorrow.</p>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Practice today. Bigger tomorrow.</p>
      </div>
      <div>
        <div style={h}>--font-display (obviously-wide)</div>
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, lineHeight: 1 }}>Quest Clear</p>
      </div>
      <div>
        <div style={h}>.label · .label--amber · .tnum</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <span className="label">Current quest</span>
          <span className="label label--amber">Unlock at</span>
          <span className="tnum" style={{ fontSize: 28, fontWeight: 700 }}>2,500</span>
        </div>
      </div>
      <div>
        <div style={h}>.chip · .pill</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span className="chip"><span style={{ color: 'var(--amber)' }}>★</span><span className="tnum">3/6</span></span>
          <span className="pill">Sniper</span>
        </div>
      </div>
      <div>
        <div style={h}>.btn variants</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn">Done</button>
          <button className="btn btn--ghost"><span className="btn__icon">⚙</span> Settings</button>
          <button className="btn btn--amber">Play</button>
          <button className="btn btn--amber btn--big">Play <span className="btn__icon">→</span></button>
        </div>
      </div>
      <div>
        <div style={h}>.panel</div>
        <div className="panel" style={{ padding: 16 }}>A translucent surface over the scene.</div>
      </div>
    </div>
  ),
}
