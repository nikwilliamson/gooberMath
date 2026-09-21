import { useEffect, useReducer, useState } from 'react'
import { debugEntries, deviceInfo, onDebug } from '@/voice/debug'
import './VoiceDebug.css'

/**
 * `?voicedebug` only. The last few recognizer results and decisions, and a
 * button that copies the whole log to paste somewhere for tuning.
 */
export function VoiceDebug() {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => onDebug(bump), [])

  const entries = debugEntries()
  const copy = async () => {
    const text = JSON.stringify({ device: deviceInfo(), entries }, null, 1)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy the voice log:', text)
    }
  }

  return (
    <div className="voicedebug" data-open={open || undefined}>
      <div className="voicedebug__bar">
        <button onClick={() => setOpen((o) => !o)}>voice {open ? '▾' : '▸'}</button>
        <span>{entries.length}</span>
        <button onClick={() => void copy()}>{copied ? 'copied' : 'copy log'}</button>
      </div>
      {open && (
        <ol className="voicedebug__list">
          {entries.slice(-8).map((e, i) => (
            <li key={`${e.t}-${i}`}>
              <b>{e.kind}</b> {JSON.stringify({ ...e, t: undefined, kind: undefined })}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
