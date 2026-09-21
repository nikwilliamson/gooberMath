import type { ReactNode } from 'react'
import { Label, Num } from './Text'

/**
 * One line of the results card: glyph, caption, big tabular value. `index`
 * staggers the entrance animation.
 */
export function StatRow({ icon, label, index, children }: { icon: ReactNode; label: string; index: number; children: ReactNode }) {
  return (
    <div className="statrow stagger" style={{ ['--i' as string]: index }}>
      <span className="statrow__icon">{icon}</span>
      <div className="statrow__body">
        <Label>{label}</Label>
        <Num className="statrow__v">{children}</Num>
      </div>
    </div>
  )
}

/** A thin progress bar with its caption above: "2,140 of 2,500 to unlock". */
export function TargetBar({ label, pct }: { label: ReactNode; pct: number }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <Label>{label}</Label>
      <div className="targetbar">
        <div className="targetbar__fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  )
}
