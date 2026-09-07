import { useState } from 'react'

/** Asks where the verse lives, once the text has been checked. */
export default function ReferencePrompt({
  onCheck,
}: {
  onCheck: (typed: string) => void
}) {
  const [value, setValue] = useState('')
  const ready = value.trim().length > 0

  return (
    <div className='stack'>
      <p className='small muted' style={{ fontWeight: 600 }}>
        Where is it? Book, chapter and verse.
      </p>
      <input
        type='text'
        className='ref-input'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && ready) onCheck(value)
        }}
        placeholder='Book chapter:verse'
        autoCapitalize='words'
        autoCorrect='off'
        spellCheck={false}
        enterKeyHint='done'
        aria-label='Type the reference'
      />
      <button
        type='button'
        className='btn'
        onClick={() => onCheck(value)}
        disabled={!ready}
      >
        Check reference
      </button>
    </div>
  )
}
