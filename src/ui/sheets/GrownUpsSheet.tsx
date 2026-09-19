import { useMemo, useState } from 'react'
import { statFor, tierCounts, tierOf } from '@/engine/mastery'
import { QUESTS, REGIONS } from '@/engine/quests'
import { exportSave, importSave } from '@/store/persist'
import { factKeysOf, questProgress, regionFactKeys, regionOpen, targetFor, useGame } from '@/store/game'
import type { Op } from '@/engine/types'

export function GrownUpsSheet({ onClose }: { onClose: () => void }) {
  const save = useGame((s) => s.save)
  const replaceSave = useGame((s) => s.replaceSave)
  const toggleForcedRegion = useGame((s) => s.toggleForcedRegion)
  const [io, setIo] = useState('')
  const [msg, setMsg] = useState('')

  const rows = useMemo(
    () =>
      QUESTS.map((q) => {
        const keys = factKeysOf(q)
        const counts = tierCounts(save.stats, keys)
        const prog = questProgress(save, q.id)
        const latencies = keys
          .map((k) => statFor(save.stats, k).ewmaMs)
          .filter((m) => m > 0)
        const median = latencies.length
          ? [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length / 2)]
          : 0
        return { q, counts, prog, median, target: targetFor(save, q), total: keys.length }
      }),
    [save],
  )

  const slowest = useMemo(() => {
    const all = REGIONS.flatMap((r) => regionFactKeys(r.id))
    return all
      .map((k) => statFor(save.stats, k))
      .filter((s) => s.seen > 0)
      .sort((a, b) => (b.ewmaMs || 0) - (a.ewmaMs || 0))
      .slice(0, 8)
  }, [save.stats])

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 10 }}>
          <h2 className="sheet__title">Grown-ups</h2>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="sheet__section">
          <span className="sheet__label">Quest progress</span>
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
              {rows.map(({ q, counts, prog, median, total }) => (
                <tr key={q.id}>
                  <td>
                    {prog.cleared ? '⭐ ' : ''}
                    {q.name}
                  </td>
                  <td className="num">
                    {counts.automatic}/{total}
                  </td>
                  <td className="num">{counts.known}</td>
                  <td className="num">{counts.learning + counts.new}</td>
                  <td className="num">{median ? `${(median / 1000).toFixed(1)}s` : '–'}</td>
                  <td className="num">{prog.bestSniper.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="sheet__label">
            Automatic means under 1.5s. Median is his typical recall time for that quest's facts.
          </span>
        </div>

        {slowest.length > 0 && (
          <div className="sheet__section">
            <span className="sheet__label">Slowest facts right now</span>
            <table className="data">
              <tbody>
                {slowest.map((s) => (
                  <tr key={s.key}>
                    <td>{s.key.replace(/^(add|sub|mul|div):/, '')}</td>
                    <td className="num">{(s.ewmaMs / 1000).toFixed(1)}s</td>
                    <td className="num">{Math.round((s.correct / s.seen) * 100)}%</td>
                    <td className="num">{tierOf(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="sheet__section">
          <span className="sheet__label">Open a region by hand</span>
          <div className="toggles">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                className={`toggle${regionOpen(save, r.id) ? ' toggle--on' : ''}`}
                onClick={() => toggleForcedRegion(r.id as Op)}
              >
                {r.name.split(' ')[0]}
              </button>
            ))}
          </div>
          <span className="sheet__label">
            Regions normally open when the previous boss is cleared. Forcing one open is fine if he is ready.
          </span>
        </div>

        <div className="sheet__section">
          <span className="sheet__label">Move progress between devices</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={() => {
                setIo(exportSave(save))
                setMsg('Copy this text, then paste it on the other device.')
              }}
            >
              Export
            </button>
            <button
              className="btn"
              onClick={() => {
                const data = importSave(io)
                if (!data) return setMsg('That does not look like a GooberMath save.')
                replaceSave(data)
                setMsg('Progress loaded.')
              }}
            >
              Import
            </button>
            <span className="sheet__label">{msg}</span>
          </div>
          <textarea className="io" value={io} onChange={(e) => setIo(e.target.value)} placeholder="Save data" />
        </div>
      </div>
    </div>
  )
}
