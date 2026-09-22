import type { ReactNode } from 'react'
import type { QuestDef } from '@/engine/quests'
import type { QuestStatus } from '@/store/game'
import { cx } from '../primitives'
import { LevelMarker, MARKER_HOLDS_NUMBER, type MarkerState } from '../sprites'
import './QuestNode.css'

export interface QuestNodeProps {
  /** Position in the region's ladder, from 0. */
  index: number
  quest: QuestDef
  status: QuestStatus
  marker: MarkerState
  /** The quest the card below is showing; the only one that shows its grid. */
  active: boolean
  /** Facts learned out of the number needed for mastery. */
  learned: number
  required: number
  mastered: boolean
  perfect: boolean
  onSelect: () => void
  /** The fact grid, shown only while active. */
  children?: ReactNode
}

/** One rung of the quest ladder: marker on the rail, details on the body. */
export function QuestNode({
  index, quest, status, marker, active, learned, required, mastered, perfect, onSelect, children,
}: QuestNodeProps) {
  return (
    <div className={cx('node', status === 'locked' && 'node--locked', active && 'node--active')}>
      <div className="node__rail">
        <span className={`node__marker node__marker--${marker}`}>
          <LevelMarker state={marker} width="100%" />
          {MARKER_HOLDS_NUMBER[marker] && <span className="node__num tnum">{index + 1}</span>}
        </span>
      </div>
      <button className="node__body" disabled={status === 'locked'} onClick={onSelect}>
        <span className="node__name">
          {quest.name}
          {quest.boss && <span style={{ color: 'var(--amber)' }}> &#9733;</span>}
        </span>
        <span className="node__meta">
          <span>{quest.blurb}</span>
        </span>
        {(learned > 0 || perfect) && (
          <span className="node__meta">
            {learned > 0 && (
              <span>
                {learned}/{required} facts
                {mastered ? ' ★' : ''}
              </span>
            )}
            {perfect && <span style={{ color: 'var(--amber)' }}>Perfect</span>}
          </span>
        )}
        {/* Always in the tree so it can animate open and closed. */}
        <span className="node__grid" data-open={active || undefined} aria-hidden={!active}>
          <span className="node__gridinner">{children}</span>
        </span>
      </button>
    </div>
  )
}
