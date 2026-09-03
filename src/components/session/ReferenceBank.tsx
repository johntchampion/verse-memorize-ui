import type { ReferenceStep } from '../../lib/reference'
import WordTile from './WordTile'

/**
 * Choices for one step of the reference drill. A plain list, not the rolling
 * window the word bank needs — six chips always fit.
 */
export default function ReferenceBank({
  board,
  isDone,
  wrongPosition,
  minHeight,
  onTap,
}: {
  board: ReferenceStep
  /** Past the last step: the board stays up, frozen, with the answer spent. */
  isDone: boolean
  wrongPosition: number | null
  minHeight: number | null
  onTap: (choice: string, position: number) => void
}) {
  return (
    // `minHeight` holds the dock at the height the word bank measured, so the
    // swap doesn't move it, while still letting long book names take a fourth
    // row instead of being clipped.
    <div
      className='word-bank ref-bank'
      role='group'
      aria-label='Reference choices'
      style={minHeight !== null ? { minHeight } : undefined}
    >
      {board.choices.map((choice, position) => (
        <WordTile
          key={choice}
          label={choice}
          isSpent={isDone && choice === board.answer}
          isWrong={wrongPosition === position}
          disabled={isDone}
          onTap={() => onTap(choice, position)}
        />
      ))}
    </div>
  )
}
