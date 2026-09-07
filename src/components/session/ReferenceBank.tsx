import type { ReferenceStep } from '../../lib/reference'
import WordTile from './WordTile'

/** One step of the reference drill. A plain list, not the word bank's rolling
    window — six chips always fit. */
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
    // Holds the dock at the height the word bank measured so the swap doesn't
    // move it, while still letting long book names take a fourth row.
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
