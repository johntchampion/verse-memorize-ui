import type { RefObject } from 'react'
import type { VerseChunk } from '../../lib/exercise'

export default function VerseBody({
  chunks,
  filledBlanks,
  currentBlankRef,
}: {
  chunks: VerseChunk[]
  filledBlanks: number
  currentBlankRef: RefObject<HTMLSpanElement | null>
}) {
  return (
    <p className='verse-text'>
      {chunks.map((chunk, index) => {
        const space = index > 0 ? ' ' : ''

        if (chunk.kind === 'text') {
          return (
            <span key={index}>
              {space}
              {chunk.text}
            </span>
          )
        }

        if (chunk.blankIndex < filledBlanks) {
          return (
            <span key={index}>
              {space}
              <span className='blank-filled'>{chunk.blank.filledRaw}</span>
            </span>
          )
        }

        const isCurrent = chunk.blankIndex === filledBlanks
        return (
          <span key={index}>
            {space}
            {chunk.blank.punctBefore}
            <span
              ref={isCurrent ? currentBlankRef : undefined}
              className={isCurrent ? 'blank blank-current' : 'blank'}
              aria-label='blank'
            >
              {chunk.blank.hidden}
            </span>
            {chunk.blank.punctAfter}
          </span>
        )
      })}
    </p>
  )
}
