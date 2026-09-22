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
  /** Best Sniper score on the keypad, and by voice (0 when none). */
  best: number
  bestVoice: number
  /** Warm-up is offered once, for new content. */
  warmUp: boolean
  onWarmUp: () => void
  onBlitz: () => void
  onPlay: () => void
  /** Why a run cannot start yet ("Getting voice ready…"). While set, the
      other ways in step aside and Play carries this across the row. */
  hold?: string | null
  /** Top right, beside the quest name: the voice toggle. */
  children?: ReactNode
}

/** The current quest's card: name and voice, targets, blurb, then the ways to start it. */
export function QuestBar({
  quest, cleared, mastered, unlockScore, learned, required, best, bestVoice, warmUp, onWarmUp, onBlitz, onPlay, hold, children,
}: QuestBarProps) {
  const held = Boolean(hold)
  return (
    <div className="questbar__card">
      <div className="questbar__head">
        <div className="questbar__info">
          <Label>Current quest</Label>
          <span className="questbar__name">{quest.name}</span>
        </div>
        {children}
      </div>
      <div className="questbar__stats">
        <div className="questbar__target">
          <Label>{cleared ? 'Unlocked' : 'Unlock at'}</Label>
          <Num className="questbar__targetv">{cleared ? '✓' : unlockScore.toLocaleString()}</Num>
        </div>
        <div className="questbar__target">
          <Label>Facts learned</Label>
          <Num className="questbar__targetv">
            {learned}/{required}
            {mastered ? ' ★' : ''}
          </Num>
        </div>
        <div className="questbar__target">
          <Label>Best</Label>
          <Num className="questbar__targetv">{best.toLocaleString()}</Num>
        </div>
        {bestVoice > 0 && (
          <div className="questbar__target">
            <Label>Voice</Label>
            <Num className="questbar__targetv">{bestVoice.toLocaleString()}</Num>
          </div>
        )}
      </div>
      <span className="questbar__blurb">{quest.blurb}</span>
      <div className="questbar__modes">
        {warmUp && !held && (
          <Button variant="ghost" onClick={onWarmUp}>
            Warm up
          </Button>
        )}
        {!held && (
          <Button variant="ghost" onClick={onBlitz}>
            Blitz
          </Button>
        )}
        <Button variant="amber" onClick={onPlay} disabled={held} aria-busy={held || undefined} className={held ? 'questbar__hold' : undefined}>
          {hold || 'Play'}
        </Button>
      </div>
    </div>
  )
}
