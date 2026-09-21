import { CorrectSticker, MissSticker, STICKER_ANCHORS } from '../sprites'
import './Sticker.css'

export type StickerAnchor = (typeof STICKER_ANCHORS)[number]

export interface StickerProps {
  /** Answer count when it landed; keys the slap-on animation. */
  at: number
  /** Which phrase; rotates through the sheet. */
  index: number
  missed: boolean
  /** Points earned, shown under a correct sticker. */
  points: number
  anchor: StickerAnchor
}

/** A phrase slapped beside the problem after an answer. */
export function Sticker({ index, missed, points, anchor }: StickerProps) {
  return (
    <div
      className="sticker"
      style={{ ['--rot' as string]: `${anchor.rot}deg` }}
      data-side={anchor.side}
      data-zone={anchor.zone}
      aria-hidden
    >
      {missed ? (
        <MissSticker index={index} className="sticker__img" />
      ) : (
        <>
          <CorrectSticker index={index} className="sticker__img" />
          <span className="sticker__points">+{points.toLocaleString()}</span>
        </>
      )}
    </div>
  )
}

/**
 * One of the two boxes above and below the problem card. A sticker lands in
 * whichever zone its anchor names; the other stays empty so the equation can
 * never be covered.
 */
export function StickerZone({ zone, sticker }: { zone: StickerAnchor['zone']; sticker: StickerProps | null }) {
  return <div className="board__zone">{sticker && sticker.anchor.zone === zone && <Sticker key={sticker.at} {...sticker} />}</div>
}
