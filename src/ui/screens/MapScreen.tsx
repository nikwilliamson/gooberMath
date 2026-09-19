import { useMemo, useState } from 'react'
import { audio } from '@/audio/engine'
import { questsIn, type QuestDef } from '@/engine/quests'
import { UNLOCK_SCORE } from '@/engine/scoring'
import type { Mode, Op } from '@/engine/types'
import {
  allRegions, factKeysOf, questMastery, questProgress, questStatus, useGame,
} from '@/store/game'
import { OP_ACCENT, SplatField } from '../art'
import { ART } from '../sprites'
import { FactGrid } from '../components/FactGrid'

const OP_NAME: Record<Op, string> = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' }
const OP_SHORT: Record<Op, string> = { add: 'Add', sub: 'Subtract', mul: 'Multiply', div: 'Divide' }
const OP_SYM: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' }

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
    audio.primeMusic()
    begin(questId, mode, untimed)
  }

  const currentStatus = current ? questStatus(save, current) : 'locked'
  const currentProg = current ? questProgress(save, current.id) : null

  return (
    <div className="app" data-region={region}>
      <div
        className="scene scene--art"
        // One backdrop across all four worlds; the region accent and splats do
        // the differentiating. The second scene made three tabs feel like a
        // different, lesser screen.
        style={{ backgroundImage: `url(${ART.additionFields})` }}
      >
        <SplatField count={2} seed={worldNo * 4} color={OP_ACCENT[region]} opacity={0.07} />
      </div>

      <div className="map screen-in">
        <header className="map__head">
          <button className="btn btn--ghost" onClick={() => go('title')} aria-label="Back">
            &#8592;
          </button>
          <div className="map__world">
            <span className="label">World {worldNo}</span>
            <h1 className="map__op">{OP_NAME[region]}</h1>
            <span className="map__sub">{regionDef.name}</span>
          </div>
          <span className="spacer" />
          <span className="chip">
            <span style={{ color: 'var(--amber)' }}>&#9733;</span>
            <span className="tnum">
              {clearedHere}/{quests.length}
            </span>
          </span>
          <button className="btn btn--ghost" onClick={onSettings} aria-label="Settings">
            &#9881;
          </button>
        </header>

        <div className="nodes">
          <p className="map__blurb">{regionDef.blurb}</p>
          {quests.map((quest, i) => {
            const status = questStatus(save, quest)
            const prog = questProgress(save, quest.id)
            const isCurrent = current?.id === quest.id
            const last = i === quests.length - 1
            return (
              <div key={quest.id} className={`node${status === 'locked' ? ' node--locked' : ''}`}>
                <div className="node__rail">
                  <span
                    className={`node__dot${status === 'cleared' ? ' node__dot--done' : ''}${
                      isCurrent && status !== 'locked' ? ' node__dot--current' : ''
                    }`}
                  >
                    {status === 'cleared' ? '✓' : status === 'locked' ? '🔒' : i + 1}
                  </span>
                  {!last && <span className={`node__line${status === 'cleared' ? ' node__line--done' : ''}`} />}
                </div>
                <button
                  className="node__body"
                  disabled={status === 'locked'}
                  onClick={() => setSelected(quest.id)}
                >
                  <span className="node__name">
                    {quest.name}
                    {quest.boss && <span style={{ color: 'var(--amber)' }}> &#9733;</span>}
                  </span>
                  <span className="node__meta">
                    <span>{quest.blurb}</span>
                  </span>
                  <span className="node__meta">
                    <span>
                      {questMastery(save, quest).learned}/{questMastery(save, quest).required} facts
                      {prog.mastered ? ' ★' : ''}
                    </span>
                    <span>Best {prog.bestSniper.toLocaleString()}</span>
                    {prog.perfect && <span style={{ color: 'var(--amber)' }}>Perfect</span>}
                  </span>
                  <span className="node__grid">
                    <FactGrid keys={factKeysOf(quest)} stats={save.stats} />
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="questbar">
          {current && currentStatus !== 'locked' && (
            <div className="panel questbar__card">
              <div className="questbar__info">
                <span className="label">Current quest</span>
                <span className="questbar__name">{current.name}</span>
                <span className="questbar__blurb">{current.blurb}</span>
              </div>
              <div className="questbar__target">
                <span className="label">{currentProg?.cleared ? 'Unlocked' : 'Unlock at'}</span>
                <span className="questbar__targetv tnum">
                  {currentProg?.cleared
                    ? '✓'
                    : (current.unlockScore ?? UNLOCK_SCORE).toLocaleString()}
                </span>
              </div>
              <div className="questbar__target">
                <span className="label">Facts learned</span>
                <span className="questbar__targetv tnum">
                  {questMastery(save, current).learned}/{questMastery(save, current).required}
                  {currentProg?.mastered ? ' ★' : ''}
                </span>
              </div>
              <div className="questbar__modes">
                {current.untimedFirst && !currentProg?.practiced && (
                  <button className="btn btn--ghost" onClick={() => start(current.id, 'sniper', true)}>
                    Warm up
                  </button>
                )}
                <button className="btn btn--ghost" onClick={() => start(current.id, 'blitz', false)}>
                  Blitz
                </button>
                <button className="btn btn--amber" onClick={() => start(current.id, 'sniper', false)}>
                  Play
                </button>
              </div>
            </div>
          )}

          <nav className="optabs">
            {allRegions.map((r) => {
              const done = questsIn(r.id).filter((q) => questProgress(save, q.id).cleared).length
              return (
                <button
                  key={r.id}
                  className={`optab${r.id === region ? ' optab--active' : ''}`}
                  style={{ ['--tab' as string]: OP_ACCENT[r.id] }}
                  onClick={() => {
                    setRegion(r.id)
                    setSelected(null)
                  }}
                >
                  <span className="optab__sym">{OP_SYM[r.id]}</span>
                  {OP_SHORT[r.id]}
                  <span className="label" style={{ letterSpacing: '0.1em' }}>
                    {done}/{questsIn(r.id).length}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
