import { useState } from 'react'
import { audio } from '@/audio/engine'
import { questsIn } from '@/engine/quests'
import type { Mode } from '@/engine/types'
import { cosmeticById, levelFromXp } from '@/store/cosmetics'
import {
  allQuests, allRegions, factKeysOf, questProgress, questStatus, regionFactKeys, regionOpen,
  targetFor, useGame,
} from '@/store/game'
import { Cloud, Goober, SplatField } from '../art'
import { FactGrid } from '../components/FactGrid'

export function MapScreen({ onSettings }: { onSettings: () => void }) {
  const save = useGame((s) => s.save)
  const go = useGame((s) => s.go)
  const begin = useGame((s) => s.begin)
  const [picked, setPicked] = useState<string | null>(null)

  const { level, into, need } = levelFromXp(save.xp)
  const hue = cosmeticById(save.goober)?.hue ?? 222
  const clearedCount = allQuests.filter((q) => questProgress(save, q.id).cleared).length
  const stars = save.xp

  const start = (questId: string, mode: Mode, untimed: boolean) => {
    audio.unlock()
    begin(questId, mode, untimed)
  }

  return (
    <div className="app">
      <div className="scene scene--sky">
        <Cloud style={{ left: '6%', top: '4%', width: 170 }} />
        <Cloud style={{ left: '66%', top: '11%', width: 130, opacity: 0.85 }} />
        <SplatField count={6} seed={11} opacity={0.34} />
      </div>

      <div className="map">
        <div className="map__inner">
          <div className="topbar">
            <button className="btn" onClick={() => go('title')}>
              &#8592; Back
            </button>
            <span className="chip chip--parch">
              &#11088; <span className="tnum">{stars}</span>
            </span>
            <span className="chip">
              Lv <span className="tnum">{level}</span>
            </span>
            <span className="spacer" />
            <button className="btn" onClick={onSettings} aria-label="Settings">
              &#9881;
            </button>
            <Goober mood="happy" hue={hue} size={40} />
          </div>

          <div className="meters">
            <div className="progresswrap">
              <span className="hud__label">
                Quests &middot; {clearedCount}/{allQuests.length}
              </span>
              <div className="bar">
                <div className="bar__fill" style={{ width: `${(clearedCount / allQuests.length) * 100}%` }} />
              </div>
            </div>
            <div className="progresswrap">
              <span className="hud__label">Next unlock &middot; {need - into} xp</span>
              <div className="bar">
                <div className="bar__fill" style={{ width: `${(into / need) * 100}%` }} />
              </div>
            </div>
          </div>

          {allRegions.map((region) => {
            const open = regionOpen(save, region.id)
            const quests = questsIn(region.id)
            const cleared = quests.filter((q) => questProgress(save, q.id).cleared).length
            return (
              <section
                key={region.id}
                className={`region${open ? '' : ' region--locked'}`}
                data-region={region.id}
              >
                <header className="region__head">
                  <h2 className="region__name outline">{region.name}</h2>
                  <span className="chip">
                    {open ? `${cleared}/${quests.length} complete` : '🔒 Locked'}
                  </span>
                  <span className="spacer" />
                  <FactGrid keys={regionFactKeys(region.id)} stats={save.stats} />
                </header>
                <p className="region__blurb">{region.blurb}</p>

                <div className="quests">
                  {quests.map((quest) => {
                    const status = questStatus(save, quest)
                    const prog = questProgress(save, quest.id)
                    const target = targetFor(save, quest)
                    const locked = status === 'locked'
                    const isPicked = picked === quest.id
                    return (
                      <div
                        key={quest.id}
                        className={`quest${locked ? ' quest--locked' : ''}${
                          status === 'cleared' ? ' quest--cleared' : ''
                        }${quest.boss ? ' quest--boss' : ''}`}
                      >
                        <button
                          className="quest__head"
                          disabled={locked}
                          aria-expanded={isPicked}
                          onClick={() => setPicked(isPicked ? null : quest.id)}
                        >
                          <span className="quest__top">
                            <span className="quest__name">{quest.name}</span>
                            <span className="spacer" />
                            <span className="quest__marks">
                              {status === 'cleared' && <span title="Cleared">&#11088;</span>}
                              {prog.perfect && <span title="Perfect run">&#128081;</span>}
                              {prog.blitzCleared && <span title="Blitz clear">&#9889;</span>}
                              {locked && <span>&#128274;</span>}
                              {quest.boss && !locked && <span title="Boss">&#128481;</span>}
                            </span>
                          </span>
                          <span className="quest__blurb">{quest.blurb}</span>
                          <span className="quest__meta">
                            <span>Target {target.toLocaleString()}</span>
                            <span>Best {prog.bestSniper.toLocaleString()}</span>
                            {quest.untimedFirst && !prog.practiced && <span>New facts</span>}
                          </span>
                          <FactGrid keys={factKeysOf(quest)} stats={save.stats} />
                        </button>

                        {isPicked && !locked && (
                          <div className="quest__modes">
                            {quest.untimedFirst && !prog.practiced && (
                              <button className="btn btn--ink" onClick={() => start(quest.id, 'sniper', true)}>
                                Warm up &middot; no clock
                              </button>
                            )}
                            <button className="btn btn--purple" onClick={() => start(quest.id, 'sniper', false)}>
                              Sniper &middot; clears quest
                            </button>
                            <button className="btn btn--yellow" onClick={() => start(quest.id, 'blitz', false)}>
                              Blitz &middot; pure speed
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
