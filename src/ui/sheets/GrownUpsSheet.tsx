import { useMemo, useState } from 'react'
import { statFor, tierCounts, tierOf } from '@/engine/mastery'
import { QUESTS, REGIONS } from '@/engine/quests'
import { exportSave, importSave } from '@/store/persist'
import { factKeysOf, questProgress, regionFactKeys, useGame } from '@/store/game'
import { useVoiceStatus } from '@/voice/status'
import { GrownUpsPanel, type QuestRow, type SlowFact } from './GrownUpsPanel'

/** Derives the progress tables from the save and wires the sheet's actions. */
export function GrownUpsSheet({ onClose }: { onClose: () => void }) {
  const save = useGame((s) => s.save)
  const replaceSave = useGame((s) => s.replaceSave)
  const setSettings = useGame((s) => s.setSettings)
  const voiceModel = useVoiceStatus((s) => s.model)
  const [voiceMsg, setVoiceMsg] = useState('')
  const [io, setIo] = useState('')
  const [msg, setMsg] = useState('')

  const rows = useMemo<QuestRow[]>(
    () =>
      QUESTS.map((q) => {
        const keys = factKeysOf(q)
        const counts = tierCounts(save.stats, keys)
        const prog = questProgress(save, q.id)
        const latencies = keys
          .map((k) => statFor(save.stats, k).ewmaMs)
          .filter((m) => m > 0)
        const medianMs = latencies.length
          ? [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length / 2)]
          : 0
        return {
          id: q.id,
          name: q.name,
          mastered: prog.mastered,
          cleared: prog.cleared,
          automatic: counts.automatic,
          known: counts.known,
          learning: counts.learning + counts.new,
          total: keys.length,
          medianMs,
          bestSniper: prog.bestSniper,
        }
      }),
    [save],
  )

  const slowest = useMemo<SlowFact[]>(() => {
    const all = REGIONS.flatMap((r) => regionFactKeys(r.id))
    return all
      .map((k) => statFor(save.stats, k))
      .filter((s) => s.seen > 0)
      .sort((a, b) => (b.ewmaMs || 0) - (a.ewmaMs || 0))
      .slice(0, 8)
      .map((s) => ({ key: s.key, ewmaMs: s.ewmaMs, accuracy: s.correct / s.seen, tier: tierOf(s) }))
  }, [save.stats])

  return (
    <GrownUpsPanel
      rows={rows}
      slowest={slowest}
      voiceNote={voiceMsg || (voiceModel === 'ready' ? 'Installed on this device.' : '')}
      onRemoveVoice={async () => {
        setSettings({ voice: false })
        const { deleteModel } = await import('@/voice/listener')
        await deleteModel()
        setVoiceMsg('Voice model removed from this device.')
      }}
      io={io}
      onIoChange={setIo}
      ioNote={msg}
      onExport={() => {
        setIo(exportSave(save))
        setMsg('Copy this text, then paste it on the other device.')
      }}
      onImport={() => {
        const data = importSave(io)
        if (!data) return setMsg('That does not look like a GooberMath save.')
        replaceSave(data)
        setMsg('Progress loaded.')
      }}
      onClose={onClose}
    />
  )
}
