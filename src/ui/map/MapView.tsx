import type { ReactNode } from 'react'
import type { Op } from '@/engine/types'
import { FactGrid } from '../components/FactGrid'
import { Scene } from '../primitives'
import { REGION_ART } from '../sprites'
import { MapHeader, type MapHeaderProps } from './MapHeader'
import { OpTabs, type OpTabsProps } from './OpTabs'
import { QuestBar, type QuestBarProps } from './QuestBar'
import { QuestNode, type QuestNodeProps } from './QuestNode'

export interface MapNode extends Omit<QuestNodeProps, 'onSelect' | 'children' | 'index'> {
  /** Fact keys and their stats, for the grid. */
  grid: Parameters<typeof FactGrid>[0]
}

export interface MapViewProps {
  region: Op
  blurb: string
  header: Omit<MapHeaderProps, 'op'>
  nodes: MapNode[]
  /** The selected quest's card; null when the region has nothing playable. */
  current: Omit<QuestBarProps, 'children'> | null
  tabs: OpTabsProps
  onSelect: (questId: string) => void
  /** Rendered inside the quest bar (the voice toggle). */
  questBarExtra?: ReactNode
}

/** The world map from plain props. MapScreen wires it to the store. */
export function MapView({ region, blurb, header, nodes, current, tabs, onSelect, questBarExtra }: MapViewProps) {
  return (
    <div className="app" data-region={region}>
      <Scene key={region} art={REGION_ART[region]} />

      <div className="map screen-in">
        <MapHeader {...header} op={region} />

        <div className="nodes">
          <p className="map__blurb">{blurb}</p>
          {nodes.map(({ grid, ...node }, i) => (
            <QuestNode key={node.quest.id} index={i} {...node} onSelect={() => onSelect(node.quest.id)}>
              <FactGrid {...grid} />
            </QuestNode>
          ))}
        </div>

        <div className="questbar">
          {current && <QuestBar {...current}>{questBarExtra}</QuestBar>}
          <OpTabs {...tabs} />
        </div>
      </div>
    </div>
  )
}
