import type { Op } from '@/engine/types'
import { OP_ACCENT } from '../art'
import { Label, cx } from '../primitives'
import { OP_SHORT, OP_SYM } from './MapHeader'
import './OpTabs.css'

export interface OpTabsProps {
  region: Op
  /** Cleared and total quest counts per region. */
  counts: Record<Op, { done: number; total: number }>
  onChange: (region: Op) => void
}

const ORDER: Op[] = ['add', 'sub', 'mul', 'div']

/** The four region tabs along the bottom of the map. */
export function OpTabs({ region, counts, onChange }: OpTabsProps) {
  return (
    <nav className="optabs">
      {ORDER.map((op) => (
        <button
          key={op}
          className={cx('optab', op === region && 'optab--active')}
          style={{ ['--tab' as string]: OP_ACCENT[op] }}
          onClick={() => onChange(op)}
        >
          <span className="optab__sym">{OP_SYM[op]}</span>
          {OP_SHORT[op]}
          <Label style={{ letterSpacing: '0.1em' }}>
            {counts[op].done}/{counts[op].total}
          </Label>
        </button>
      ))}
    </nav>
  )
}
