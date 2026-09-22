import { useEffect, useState } from 'react'
import { Button, Label } from '../primitives'
import './VoiceGateView.css'

/**
 * What the scrim says while the model loads, one line at a time. Written for
 * a second grader who is about to talk to his iPad: the things that actually
 * make voice work, said the way he would. The quiet-room one goes first
 * because it is the one that matters most (a TV in the room is the top
 * cause of misheard answers).
 */
export const VOICE_TIPS = [
  'Shhh… make sure it’s quiet.',
  'Turn the TV off. For real.',
  'Say the answer nice and loud.',
  'Just the number. Not the whole problem.',
  'Talk to it like it’s across the room.',
  'Messed up? Just say the right one.',
  'Wait for the 3… 2… 1… then go.',
]

/** Long enough to read the longest line twice. */
export const TIP_MS = 2600

export interface VoiceGateViewProps {
  /** The small line: what is happening. */
  eyebrow: string
  /** The big lines, shown one at a time, rotating. One entry means no rotation. */
  lines: readonly string[]
  /** Offered once the wait has gone on a while: carry on with the keypad. */
  onSkip?: (() => void) | null
}

/**
 * A scrim over the map while voice gets ready: the model loading, or the
 * permission prompt up. Nothing under it can be tapped, so the run cannot
 * start blind; the sheet iOS shows for the mic sits over this rather than
 * over a countdown.
 */
export function VoiceGateView({ eyebrow, lines, onSkip }: VoiceGateViewProps) {
  const [i, setI] = useState(0)
  useEffect(() => {
    setI(0)
    if (lines.length < 2) return
    const id = window.setInterval(() => setI((n) => (n + 1) % lines.length), TIP_MS)
    return () => window.clearInterval(id)
  }, [lines])

  return (
    <div className="voicegate" role="status" aria-live="polite">
      <div className="voicegate__body">
        <span className="voicegate__ring" aria-hidden>
          <MicGlyph />
        </span>
        <Label className="voicegate__eyebrow">{eyebrow}</Label>
        <span key={i} className="voicegate__line">
          {lines[i]}
        </span>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip} className="voicegate__skip">
            Use the keypad instead
          </Button>
        )}
      </div>
    </div>
  )
}

function MicGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="voicegate__mic">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
