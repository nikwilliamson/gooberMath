import { useMemo, useRef, useState } from 'react'
import { audio } from '@/audio/engine'
import { questsIn, type QuestDef } from '@/engine/quests'
import { UNLOCK_SCORE } from '@/engine/scoring'
import type { Mode, Op } from '@/engine/types'
import {
  allRegions, factKeysOf, questMastery, questProgress, questStatus, useGame,
} from '@/store/game'
import { primeMicPermission } from '@/voice/permission'
import { VoiceGate } from '../components/VoiceGate'
import { VoiceToggle } from '../components/VoiceToggle'
import { MapView, type MapNode } from '../map/MapView'
import type { MarkerState } from '../sprites'

/** Wires the map to the store; MapView draws it. */
export function MapScreen({ onSettings }: { onSettings: () => void }) {
  const save = useGame((s) => s.save)
  const go = useGame((s) => s.go)
  const begin = useGame((s) => s.begin)
  const setSettings = useGame((s) => s.setSettings)
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

  const voiceOn = save.settings.voice
  const starting = useRef(false)
  const start = async (questId: string, mode: Mode, untimed: boolean) => {
    if (starting.current) return
    starting.current = true
    audio.unlock()
    audio.primeMusic()
    // iOS can ask for the mic again on every launch, whatever the toggle
    // asked earlier. Asked here, inside the tap, the sheet comes up over the
    // map (behind the VoiceGate scrim); the run's own mic open then goes
    // through without one.
    // Refused: voice goes off so the map can say so, and the run is a keypad one.
    if (voiceOn && !(await primeMicPermission())) setSettings({ voice: false })
    starting.current = false
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
      active: current?.id === quest.id,
      learned: mastery.learned,
      required: mastery.required,
      mastered: prog.mastered,
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
    <>
      <MapView
        region={region}
        header={{ worldNo, name: regionDef.name, blurb: regionDef.blurb, cleared: clearedHere, total: quests.length, onBack: () => go('title'), onSettings }}
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
                best: currentProg.bestSniper,
                bestVoice: currentProg.bestSniperVoice,
                warmUp: Boolean(current.untimedFirst) && !currentProg.practiced,
                onWarmUp: () => void start(current.id, 'sniper', true),
                onBlitz: () => void start(current.id, 'blitz', false),
                onPlay: () => void start(current.id, 'sniper', false),
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
      <VoiceGate />
    </>
  )
}
