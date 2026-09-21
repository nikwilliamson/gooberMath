import type { Cosmetic } from '@/store/cosmetics'
import { GooberCap, RoughText, SplatBurst } from '../art'
import { Button, Label } from '../primitives'
import { GooberSprite } from '../sprites'
import './RewardCard.css'

export interface RewardCardProps {
  reward: Cosmetic
  /** Which reward in this run's sequence; seeds the splat. */
  index: number
  onEquip: () => void
  onLater: () => void
}

const KIND_NAME: Record<Cosmetic['kind'], string> = { goober: 'Goober skin', pad: 'Pad skin', sound: 'Sound pack' }

/** A newly unlocked cosmetic, presented over the results. */
export function RewardCard({ reward, index, onEquip, onLater }: RewardCardProps) {
  return (
    <div className="reward">
      <div className="reward__card">
        <RoughText text="New Reward!" size={72} color="#ffffff" seed={6} className="fb-word" style={{ maxWidth: 420 }} />
        <div className="reward__art">
          <span className="reward__glow reward-glow" />
          <SplatBurst className="reward__splat fb-splat" color="#f5b21f" color2="#35d6ef" seed={index + 3} />
          {reward.kind === 'goober' ? (
            <GooberSprite pose="cheer" width={180} className="reward-in" />
          ) : (
            <GooberCap size={190} className="reward-in" />
          )}
        </div>
        <span className="reward__name">{reward.name}</span>
        <span className="reward__kind">{KIND_NAME[reward.kind]}</span>
        <div className="reward__actions">
          <Button variant="amber" onClick={onEquip}>
            Equip
          </Button>
          <Button variant="ghost" onClick={onLater}>
            Later
          </Button>
        </div>
        <Label>More to unlock. Keep going.</Label>
      </div>
    </div>
  )
}
