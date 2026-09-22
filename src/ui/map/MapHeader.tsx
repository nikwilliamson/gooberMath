import type { Op } from '@/engine/types'
import { Button, Chip, Label, Num } from '../primitives'
import './MapHeader.css'

export const OP_NAME: Record<Op, string> = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' }
export const OP_SHORT: Record<Op, string> = { add: 'Add', sub: 'Subtract', mul: 'Multiply', div: 'Divide' }
export const OP_SYM: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' }

export interface MapHeaderProps {
  worldNo: number
  /** Region name: "Plus Plains". */
  name: string
  op: Op
  /** One line under the name: the region's blurb. */
  blurb: string
  /** Quests cleared in this region, out of `total`. */
  cleared: number
  total: number
  onBack: () => void
  onSettings: () => void
}

/** Back, world title with its blurb, cleared count, settings. One tight block. */
export function MapHeader({ worldNo, name, op, blurb, cleared, total, onBack, onSettings }: MapHeaderProps) {
  return (
    <header className="map__head">
      <Button variant="ghost" iconOnly onClick={onBack} aria-label="Back">
        &#8592;
      </Button>
      <div className="map__world">
        <Label>
          World {worldNo} <span className="map__dot">&middot;</span> {OP_NAME[op]}
        </Label>
        <h1 className="map__op">{name}</h1>
        <span className="map__sub">{blurb}</span>
      </div>
      <span className="spacer" />
      <Chip>
        <span style={{ color: 'var(--amber)' }}>&#9733;</span>
        <Num>
          {cleared}/{total}
        </Num>
      </Chip>
      <Button variant="ghost" iconOnly onClick={onSettings} aria-label="Settings">
        &#9881;
      </Button>
    </header>
  )
}
