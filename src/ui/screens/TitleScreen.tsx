import { audio } from '@/audio/engine'
import { useGame } from '@/store/game'
import { TitleView } from './TitleView'

export function TitleScreen({ onSettings, onGrownUps }: { onSettings: () => void; onGrownUps: () => void }) {
  const go = useGame((s) => s.go)

  const play = () => {
    audio.unlock()
    audio.primeMusic()
    audio.fanfare()
    go('map')
  }

  return <TitleView onPlay={play} onSettings={onSettings} onGrownUps={onGrownUps} />
}
