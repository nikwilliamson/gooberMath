import type { Tier } from '@/engine/types'
import { Button, Sheet, SheetNote, SheetSection } from '../primitives'
import './GrownUpsPanel.css'

export interface QuestRow {
  id: string
  name: string
  mastered: boolean
  cleared: boolean
  automatic: number
  known: number
  learning: number
  total: number
  /** Median recall time for the quest's facts, ms; 0 with no data. */
  medianMs: number
  bestSniper: number
}

export interface SlowFact {
  key: string
  ewmaMs: number
  accuracy: number
  tier: Tier
}

export interface GrownUpsPanelProps {
  rows: QuestRow[]
  slowest: SlowFact[]
  /** Line under the voice button: "Installed on this device." or the result of removing it. */
  voiceNote: string
  onRemoveVoice: () => void
  /** The export/import textarea. */
  io: string
  onIoChange: (text: string) => void
  /** Line beside Export/Import. */
  ioNote: string
  onExport: () => void
  onImport: () => void
  onClose: () => void
}

const factLabel = (key: string) => key.replace(/^(add|sub|mul|div):/, '')

/** The grown-ups sheet from plain props. GrownUpsSheet wires it to the store. */
export function GrownUpsPanel({
  rows, slowest, voiceNote, onRemoveVoice, io, onIoChange, ioNote, onExport, onImport, onClose,
}: GrownUpsPanelProps) {
  return (
    <Sheet title="Grown-ups" onClose={onClose}>
      <SheetSection label="Quest progress">
        <table className="data">
          <thead>
            <tr>
              <th>Quest</th>
              <th className="num">Auto</th>
              <th className="num">Known</th>
              <th className="num">Learning</th>
              <th className="num">Median</th>
              <th className="num">Best</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {/* ⭐ is mastery of the facts; ✓ only means he unlocked the next quest. */}
                  {r.mastered ? '⭐ ' : r.cleared ? '✓ ' : ''}
                  {r.name}
                </td>
                <td className="num">
                  {r.automatic}/{r.total}
                </td>
                <td className="num">{r.known}</td>
                <td className="num">{r.learning}</td>
                <td className="num">{r.medianMs ? `${(r.medianMs / 1000).toFixed(1)}s` : '–'}</td>
                <td className="num">{r.bestSniper.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <SheetNote>Automatic means under 1.5s. Median is his typical recall time for that quest's facts.</SheetNote>
      </SheetSection>

      {slowest.length > 0 && (
        <SheetSection label="Slowest facts right now">
          <table className="data">
            <tbody>
              {slowest.map((s) => (
                <tr key={s.key}>
                  <td>{factLabel(s.key)}</td>
                  <td className="num">{(s.ewmaMs / 1000).toFixed(1)}s</td>
                  <td className="num">{Math.round(s.accuracy * 100)}%</td>
                  <td className="num">{s.tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SheetSection>
      )}

      <SheetSection label="Voice answers">
        <SheetNote>
          Speech is recognized entirely on this device, and it can only recognize the numbers zero to one
          hundred. Audio is processed in memory as he speaks and is never saved or sent anywhere. The mic is on
          only during a voice run.
        </SheetNote>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={onRemoveVoice}>Remove voice model</Button>
          <SheetNote>{voiceNote}</SheetNote>
        </div>
      </SheetSection>

      <SheetSection label="Move progress between devices">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={onExport}>Export</Button>
          <Button onClick={onImport}>Import</Button>
          <SheetNote>{ioNote}</SheetNote>
        </div>
        <textarea className="io" value={io} onChange={(e) => onIoChange(e.target.value)} placeholder="Save data" />
      </SheetSection>
    </Sheet>
  )
}
