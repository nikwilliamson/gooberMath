export interface AnswerRevealProps {
  /** Left side without the equals sign: "7 + 8". */
  left: string
  answer: number
  /** What he entered; empty when nothing was. */
  entry: string
  /** The reveal ignores taps for a beat, then this flips and the hint lights up. */
  ready: boolean
  onDismiss: () => void
}

/**
 * The held wrong-answer reveal. Tap anywhere to move on. The clock is already
 * paused here, so this beat costs nothing but the miss penalty — reading the
 * whole fact is the part that actually teaches, and a reveal that vanished
 * on a timer was gone before he had read it.
 */
export function AnswerReveal({ left, answer, entry, ready, onDismiss }: AnswerRevealProps) {
  return (
    <button className="fb fb--answer" onClick={ready ? onDismiss : undefined} aria-label="Next problem">
      <div className="fb__answer fb-word">
        <span className="fb__answersub">Not quite</span>
        <span className="fb__answerv tnum">
          {left} = {answer}
        </span>
        {entry !== '' && (
          <span className="fb__answeryou">
            you said <b className="tnum">{entry}</b>
          </span>
        )}
        <span className="fb__answertap" data-ready={ready || undefined}>
          Tap to keep going
        </span>
      </div>
    </button>
  )
}
