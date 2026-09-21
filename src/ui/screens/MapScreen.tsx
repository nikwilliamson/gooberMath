import { useMemo, useState } from 'react'
import { audio } from '@/audio/engine'
import { questsIn, type QuestDef } from '@/engine/quests'
import { UNLOCK_SCORE } from '@/engine/scoring'
import type { Mode, Op } from '@/engine/types'
import {
  allRegions, factKeysOf, questMastery, questProgress, questStatus, useGame,
} from '@/store/game'
import { VoiceToggle } from '../components/VoiceToggle'
import { MapView, type MapNode } from '../map/MapView'
import type { MarkerState } from '../sprites'

/** Wires the map to the store; MapView draws it. */
export function MapScreen({ onSettings }: { onSettings: () => void }) {
  const save = useGame((s) => s.save)
  const go = useGame((s) => s.go)
  const begin = useGame((s) => s.begin)
  const [region, setRegion] = useState<Op>('add')
  const [selected, setSelected] = useState<string | null>(null)

  const quests = questsIn(region)
  const regionDef = allRegions.find((r) => r.id === region)!
  const clearedHere = quests.filter((q) => questProgress(save, q.id).cleared).length
  const worldNo = allRegions.findIndex((r) => r.id === region) + 1

  // Default focus is the first quest he has not cleared.
  const current: QuestDef | undefined = useMemo(() => {
    const picked = quests.find((q) => q.id === selected)
    if (picked && questStatus(save, picked) !== 'locked') return picked
    return quests.find((q) => !questProgress(save, q.id).cleared) ?? quests[quests.length - 1]
  }, [quests, selected, save])

  const start = (questId: string, mode: Mode, untimed: boolean) => {
    audio.unlock()
    // Voice runs route music through the context; set it before priming.
    audio.setRouted(save.settings.voice)
    audio.primeMusic()
    begin(questId, mode, untimed)
  }

  const currentStatus = current ? questStatus(save, current) : 'locked'
  const currentProg = current ? questProgress(save, current.id) : null
  const currentMastery = current ? questMastery(save, current) : null

  const nodes: MapNode[] = quests.map((quest) => {
    const status = questStatus(save, quest)
    const prog = questProgress(save, quest.id)
    const mastery = questMastery(save, quest)
    const marker: MarkerState = prog.mastered
      ? 'mastered'
      : status === 'cleared' || status === 'locked'
        ? status
        : current?.id === quest.id
          ? 'current'
          : 'open'
    return {
      quest,
      status,
      marker,
      learned: mastery.learned,
      required: mastery.required,
      mastered: prog.mastered,
      bestSniper: prog.bestSniper,
      bestSniperVoice: prog.bestSniperVoice,
      perfect: prog.perfect,
      grid: { keys: factKeysOf(quest), stats: save.stats },
    }
  })

  const counts = Object.fromEntries(
    allRegions.map((r) => [
      r.id,
      { done: questsIn(r.id).filter((q) => questProgress(save, q.id).cleared).length, total: questsIn(r.id).length },
    ]),
  ) as Record<Op, { done: number; total: number }>

  return (
    <MapView
      region={region}
      blurb={regionDef.blurb}
      header={{ worldNo, name: regionDef.name, cleared: clearedHere, total: quests.length, onBack: () => go('title'), onSettings }}
      nodes={nodes}
      current={
        current && currentProg && currentMastery && currentStatus !== 'locked'
          ? {
              quest: current,
              cleared: currentProg.cleared,
              mastered: currentProg.mastered,
              unlockScore: current.unlockScore ?? UNLOCK_SCORE,
              learned: currentMastery.learned,
              required: currentMastery.required,
              warmUp: Boolean(current.untimedFirst) && !currentProg.practiced,
              onWarmUp: () => start(current.id, 'sniper', true),
              onBlitz: () => start(current.id, 'blitz', false),
              onPlay: () => start(current.id, 'sniper', false),
            }
          : null
      }
      tabs={{
        region,
        counts,
        onChange: (r) => {
          setRegion(r)
          setSelected(null)
        },
      }}
      onSelect={setSelected}
      questBarExtra={<VoiceToggle />}
    />
  )
}
