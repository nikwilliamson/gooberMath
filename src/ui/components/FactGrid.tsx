import { statFor, tierOf } from '@/engine/mastery'
import type { StatsMap } from '@/engine/types'
import './FactGrid.css'

export function FactGrid({ keys, stats }: { keys: string[]; stats: StatsMap }) {
  return (
    <div className="factgrid" aria-label="Fact mastery">
      {keys.map((k) => {
        const tier = tierOf(statFor(stats, k))
        return <span key={k} className={`factgrid__cell factgrid__cell--${tier}`} title={`${k}: ${tier}`} />
      })}
    </div>
  )
}
