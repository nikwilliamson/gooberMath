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
  /** Facts learned out of the number needed for mastery. */
  learned: number
  required: number
  mastered: boolean
  bestSniper: number
  bestSniperVoice: number
  perfect: boolean
  onSelect: () => void
  /** The fact grid. */
  children?: ReactNode
}

/** One rung of the quest ladder: marker on the rail, details on the body. */
export function QuestNode({
  index, quest, status, marker, learned, required, mastered, bestSniper, bestSniperVoice, perfect, onSelect, children,
}: QuestNodeProps) {
  return (
    <div className={cx('node', status === 'locked' && 'node--locked')}>
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
        <span className="node__meta">
          <span>
            {learned}/{required} facts
            {mastered ? ' ★' : ''}
          </span>
          <span>Best {bestSniper.toLocaleString()}</span>
          {bestSniperVoice > 0 && <span>Voice {bestSniperVoice.toLocaleString()}</span>}
          {perfect && <span style={{ color: 'var(--amber)' }}>Perfect</span>}
        </span>
        <span className="node__grid">{children}</span>
      </button>
    </div>
  )
}
