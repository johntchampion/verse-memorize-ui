import { useState } from 'react'
import ProgressBar from '../../components/ProgressBar'
import { useFlashTimers } from '../../hooks/useFlashTimers'
import { cx } from '../../lib/cx'
import TasterVerse from './TasterVerse'
import { TASTER_ANSWERS, TASTER_BANK } from './taster'

/** The live taster — tap the two missing words. Demonstration only: it runs
    entirely in local state and counts toward nothing. */
export default function TasterStep({ onDone }: { onDone: () => void }) {
  const [filled, setFilled] = useState(0)
  const [used, setUsed] = useState<ReadonlySet<number>>(new Set())
  const [wrongTile, setWrongTile] = useState<number | null>(null)
  const flash = useFlashTimers()

  const done = filled >= TASTER_ANSWERS.length

  function tapTile(i: number, word: string) {
    if (done || used.has(i)) return
    if (word.toLowerCase() === TASTER_ANSWERS[filled].toLowerCase()) {
      setUsed((prev) => new Set(prev).add(i))
      setWrongTile(null)
      setFilled((n) => n + 1)
    } else {
      setWrongTile(i)
      flash(() => setWrongTile(null))
    }
  }

  return (
    <main
      className='shell stack shell-full onboard-step'
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <ProgressBar done={filled} total={TASTER_ANSWERS.length} />
        </div>
        <span className='progress-count'>
          {filled}/{TASTER_ANSWERS.length}
        </span>
      </header>

      <div>
        <h2 className='onboard-taster-heading'>Fill in the missing words</h2>
        <p className='small muted' style={{ fontWeight: 600, marginTop: 4 }}>
          Two words are hiding. You have the whole word bank below.
        </p>
      </div>

      <TasterVerse filled={filled} showCurrent />

      <div className='word-bank' role='group' aria-label='Word bank'>
        {TASTER_BANK.map((word, i) => {
          const isUsed = used.has(i)
          return (
            <button
              key={i}
              type='button'
              className={cx(
                'tile',
                isUsed ? 'tile-used' : wrongTile === i ? 'tile-wrong' : '',
              )}
              disabled={isUsed || done}
              onClick={() => tapTile(i, word)}
            >
              {word}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button
          className='btn'
          style={{ marginTop: 12 }}
          disabled={!done}
          onClick={onDone}
        >
          {done ? 'See what happens next →' : 'Fill both blanks to continue'}
        </button>
      </div>
    </main>
  )
}
