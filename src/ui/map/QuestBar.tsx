import type { ReactNode } from 'react'
import type { QuestDef } from '@/engine/quests'
import { Button, Label, Num } from '../primitives'
import './QuestBar.css'

export interface QuestBarProps {
  quest: QuestDef
  /** The unlock gate has been passed. */
  cleared: boolean
  mastered: boolean
  unlockScore: number
  learned: number
  required: number
  /** Warm-up is offered once, for new content. */
  warmUp: boolean
  onWarmUp: () => void
  onBlitz: () => void
  onPlay: () => void
  /** On the action row, left of the mode buttons: the voice toggle. */
  children?: ReactNode
}

/** The current quest's card: name, targets, and the ways to start it. */
export function QuestBar({
  quest, cleared, mastered, unlockScore, learned, required, warmUp, onWarmUp, onBlitz, onPlay, children,
}: QuestBarProps) {
  return (
    <div className="questbar__card">
      <div className="questbar__info">
        <Label>Current quest</Label>
        <span className="questbar__name">{quest.name}</span>
      </div>
      <div className="questbar__stats">
        <div className="questbar__target">
          <Label>{cleared ? 'Unlocked' : 'Unlock at'}</Label>
          <Num className="questbar__targetv">{cleared ? '✓' : unlockScore.toLocaleString()}</Num>
        </div>
        <div className="questbar__target">
          <Label>Facts</Label>
          <Num className="questbar__targetv">
            {learned}/{required}
            {mastered ? ' ★' : ''}
          </Num>
        </div>
      </div>
      <span className="questbar__blurb">{quest.blurb}</span>
      <div className="questbar__foot">
        {children}
        <div className="questbar__modes">
          {warmUp && (
            <Button variant="ghost" onClick={onWarmUp}>
              Warm up
            </Button>
          )}
          <Button variant="ghost" onClick={onBlitz}>
            Blitz
          </Button>
          <Button variant="amber" onClick={onPlay}>
            Play
          </Button>
        </div>
      </div>
    </div>
  )
}
