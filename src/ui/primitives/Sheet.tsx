import type { ReactNode } from 'react'
import { Button } from './Button'
import './Sheet.css'

/**
 * Bottom sheet over a scrim. Tapping the scrim closes it; tapping the sheet
 * does not. Sections go in `SheetSection`.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 10 }}>
          <h2 className="sheet__title">{title}</h2>
          <span className="spacer" />
          <Button onClick={onClose}>Done</Button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SheetSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="sheet__section">
      {label && <span className="sheet__label">{label}</span>}
      {children}
    </div>
  )
}

/** Explanatory copy inside a section, in the same quiet style as its label. */
export function SheetNote({ children }: { children: ReactNode }) {
  return <span className="sheet__label">{children}</span>
}
