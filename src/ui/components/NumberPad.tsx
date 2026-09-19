import type { CSSProperties } from 'react'
import { audio } from '@/audio/engine'

/** Per-digit colours, matching the reference pad. */
const KEY_COLORS: Record<string, [string, string, string]> = {
  '1': ['#5aa9f8', '#2f75d6', '#164a8c'],
  '2': ['#5aa9f8', '#2f75d6', '#164a8c'],
  '3': ['#5aa9f8', '#2f75d6', '#164a8c'],
  '4': ['#62cf59', '#38a63c', '#1e6524'],
  '5': ['#a678ff', '#7742e6', '#472790'],
  '6': ['#62cf59', '#38a63c', '#1e6524'],
  '7': ['#ffa64d', '#f2731f', '#98400a'],
  '8': ['#5aa9f8', '#2f75d6', '#164a8c'],
  '9': ['#ff6b97', '#e33a6b', '#8d1a3c'],
  '0': ['#5aa9f8', '#2f75d6', '#164a8c'],
}

const keyStyle = (d: string): CSSProperties => {
  const [a, b, c] = KEY_COLORS[d]
  return { ['--k-1' as string]: a, ['--k-2' as string]: b, ['--k-edge' as string]: c }
}

const LAYOUT = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function NumberPad({
  onDigit,
  onBackspace,
  disabled,
}: {
  onDigit: (d: number) => void
  onBackspace: () => void
  disabled?: boolean
}) {
  const press = (fn: () => void) => () => {
    audio.tap()
    fn()
  }
  return (
    <div className="pad" role="group" aria-label="Number pad">
      {LAYOUT.map((d) => (
        <button
          key={d}
          className="key"
          style={keyStyle(d)}
          disabled={disabled}
          onPointerDown={press(() => onDigit(Number(d)))}
          aria-label={d}
        >
          {d}
        </button>
      ))}
      <span />
      <button
        className="key"
        style={keyStyle('0')}
        disabled={disabled}
        onPointerDown={press(() => onDigit(0))}
        aria-label="0"
      >
        0
      </button>
      <button
        className="key key--back"
        disabled={disabled}
        onPointerDown={press(onBackspace)}
        aria-label="Backspace"
      >
        &#9003;
      </button>
    </div>
  )
}
