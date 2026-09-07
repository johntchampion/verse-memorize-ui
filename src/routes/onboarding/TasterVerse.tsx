import { INDEXED_PARTS, TASTER_REFERENCE } from './taster'

/** The Psalm 23:1 card, shared by the hook (all blanks open) and the taster. */
export default function TasterVerse({
  filled,
  showCurrent,
}: {
  filled: number
  showCurrent: boolean
}) {
  return (
    <div className='verse-card'>
      <p className='verse-ref'>{TASTER_REFERENCE}</p>
      <p className='verse-text'>
        {INDEXED_PARTS.map(({ part, blankIndex }, i) => {
          const space = i > 0 ? ' ' : ''
          if (blankIndex === null) {
            return (
              <span key={i}>
                {space}
                {part.word}
                {part.after}
              </span>
            )
          }
          if (blankIndex < filled) {
            return (
              <span key={i}>
                {space}
                <span className='blank-filled'>
                  {part.word}
                  {part.after}
                </span>
              </span>
            )
          }
          const current = showCurrent && blankIndex === filled
          return (
            <span key={i} style={{ whiteSpace: 'nowrap' }}>
              {space}
              <span
                className={current ? 'blank blank-current' : 'blank'}
                aria-label='blank'
              >
                {part.word}
              </span>
              {part.after}
            </span>
          )
        })}
      </p>
    </div>
  )
}
