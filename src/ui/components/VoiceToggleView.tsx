import './VoiceToggleView.css'
export interface VoiceToggleViewProps {
  on: boolean
  /** The mic prompt is up, or the model is loading. */
  busy: boolean
  /** The line under the switch, if any. */
  note: string | null
  /** The note is good news (voice is ready). */
  ok?: boolean
  onToggle: () => void
}

/** The voice switch on the map's quest bar, from plain props. */
export function VoiceToggleView({ on, busy, note, ok, onToggle }: VoiceToggleViewProps) {
  return (
    <div className="voicetoggle">
      <button
        className="voicetoggle__btn"
        role="switch"
        aria-checked={on}
        aria-busy={busy}
        onClick={onToggle}
        data-on={on || undefined}
      >
        <MicIcon />
        <span>Voice</span>
        <span className="voicetoggle__track" aria-hidden>
          <span className="voicetoggle__thumb" />
        </span>
      </button>
      {note && (
        <span className="voicetoggle__note" data-tone={ok ? 'ok' : undefined}>
          {note}
        </span>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg className="voicetoggle__icon" viewBox="0 0 24 24" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
