import type { RefObject } from 'react'
import WordTile from './WordTile'

export default function WordBank({
  tileIds,
  labels,
  spentTiles,
  wrongTileId,
  disabled,
  height,
  bankRef,
  onTap,
}: {
  tileIds: number[]
  labels: string[]
  spentTiles: ReadonlySet<number>
  wrongTileId: number | null
  disabled: boolean
  height: number | null
  bankRef: RefObject<HTMLDivElement | null>
  onTap: (tileId: number, position: number) => void
}) {
  return (
    <div
      className='word-bank'
      role='group'
      aria-label='Word bank'
      ref={bankRef}
      style={height !== null ? { height } : undefined}
    >
      {tileIds.map((tileId, position) => {
        const isSpent = spentTiles.has(tileId)
        return (
          <WordTile
            key={tileId}
            label={labels[tileId]}
            isSpent={isSpent}
            isWrong={wrongTileId === tileId}
            disabled={isSpent || disabled}
            onTap={() => onTap(tileId, position)}
          />
        )
      })}
    </div>
  )
}
