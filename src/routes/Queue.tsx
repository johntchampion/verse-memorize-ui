import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { QueueTheme, QueueVerse } from '../api/types'
import Sheet from '../components/Sheet'
import TranslationTag from '../components/TranslationTag'
import { useApi } from '../hooks/useApi'
import { STAGE_SHORT_LABELS } from '../lib/exercise'

/** Same single-line clamp the slot cards use. */
const SNIPPET_CHARS = 60

function truncate(text: string): string {
  if (text.length <= SNIPPET_CHARS) return text
  const cut = text.slice(0, SNIPPET_CHARS)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`
}

function QueueChip({ verse }: { verse: QueueVerse }) {
  if (verse.relearning)
    return <span className='chip chip-relearn'>Relearning</span>
  if (verse.inProgress)
    return <span className='chip chip-practice'>In progress</span>
  return null
}

/**
 * The practice queue: everything that hasn't been memorized and isn't in a
 * slot right now, in the order it will enter the slots. The user can nudge
 * verses up and down, pull a whole theme to the front, or reset to the default
 * order. Nothing here touches the slots directly — they refill themselves, one
 * at a time, as verses finish or get swapped out from a verse's detail view.
 */
export default function Queue() {
  const navigate = useNavigate()
  const me = useApi(() => api.me())
  const queue = useApi(() => api.queue())
  // Only for the snippets on the in-slot lines — those verses aren't in the
  // queue payload, so their text has to come from the verse list.
  const verses = useApi(() => api.verses())

  // The order is edited optimistically: arrows update local state right away
  // and persist in the background; a failed save just surfaces an error.
  const [ids, setIds] = useState<string[] | null>(null)
  // Mirrors queue.data.customized, but flips true the moment an arrow move is
  // submitted rather than waiting on a refetch — otherwise "Restore default
  // order" stays stale (disabled) until something else happens to refresh.
  const [customized, setCustomized] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [themeSheet, setThemeSheet] = useState(false)
  const [themePick, setThemePick] = useState<string | null>(null)

  // Re-seed the editable order whenever a fresh queue arrives (state adjusted
  // during render, per React's you-might-not-need-an-effect guidance).
  const [seeded, setSeeded] = useState(queue.data)
  if (queue.data !== seeded) {
    setSeeded(queue.data)
    setIds(queue.data ? queue.data.queue.map((v) => v.id) : null)
    setCustomized(queue.data?.customized ?? false)
  }

  const byId = useMemo(
    () => new Map(queue.data?.queue.map((v) => [v.id, v]) ?? []),
    [queue.data],
  )

  // Only the first load takes over the screen. A refresh after a reorder
  // keeps the current view up, so the sheet can play its exit over it.
  if (
    (me.loading && !me.data) ||
    (queue.loading && !queue.data) ||
    (verses.loading && !verses.data)
  ) {
    return (
      <main className='shell'>
        <p className='muted'>Loading…</p>
      </main>
    )
  }

  if (me.error || queue.error || !me.data || !queue.data || !ids) {
    return (
      <main className='shell stack'>
        <p className='error-text'>
          {me.error ?? queue.error ?? 'Something went wrong.'}
        </p>
        <button
          className='btn-ghost'
          onClick={() => {
            me.refetch()
            queue.refetch()
            verses.refetch()
          }}
        >
          Try again
        </button>
      </main>
    )
  }

  const { slots } = me.data
  const themes = queue.data.themes
  const textById = new Map(verses.data?.verses.map((v) => [v.id, v.text]) ?? [])

  const refreshAll = () => {
    me.refetch()
    queue.refetch()
    verses.refetch()
    setSaveError(null)
  }

  const move = (index: number, delta: number) => {
    const j = index + delta
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    next[index] = next[j]
    next[j] = ids[index]
    setIds(next)
    setCustomized(true)
    api.setQueueOrder(next).catch((err: unknown) => {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save the new order.',
      )
    })
  }

  const resetOrder = () => {
    setBusy(true)
    api
      .resetQueue()
      .then(refreshAll)
      .catch((err: unknown) => {
        setSaveError(
          err instanceof Error ? err.message : 'Could not reset the order.',
        )
      })
      .finally(() => setBusy(false))
  }

  const confirmTheme = () => {
    if (!themePick) return
    setBusy(true)
    api
      .moveThemeToTop(themePick)
      .then(() => {
        setThemeSheet(false)
        refreshAll()
      })
      .catch((err: unknown) => {
        setSaveError(
          err instanceof Error ? err.message : 'Could not move the theme.',
        )
        setThemeSheet(false)
      })
      .finally(() => setBusy(false))
  }

  const pickedTheme: QueueTheme | undefined = themes.find(
    (t) => t.id === themePick,
  )

  const nextUp = ids.length > 0 ? byId.get(ids[0]) : undefined

  return (
    <main className='shell'>
      <header className='screen-header' style={{ marginBottom: 0 }}>
        <button
          className='icon-btn'
          aria-label='Back'
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <h1>Up Next</h1>
        <span style={{ flex: 1 }} />
        <TranslationTag code={queue.data.translation} />
      </header>

      <p className='view-sub' style={{ marginTop: 10 }}>
        {customized
          ? 'Your order. Whenever a slot frees up, the verse at the top of the line moves in.'
          : 'Default order — the arc, front to back. Nudge any verse up to practice it sooner.'}
      </p>

      <div className='queue-actions'>
        <button
          className='btn-ghost queue-action'
          onClick={() => setThemeSheet(true)}
          disabled={busy}
        >
          Move a theme to top
        </button>
        <button
          className='btn-ghost queue-action'
          onClick={resetOrder}
          disabled={busy || !customized}
        >
          Restore default order
        </button>
      </div>

      {saveError && <p className='error-text'>{saveError}</p>}

      <section className='queue-slots-card' aria-label='In your slots now'>
        <div className='eyebrow'>In your slots now</div>
        {slots.active.length === 0 ? (
          <p className='small muted' style={{ fontWeight: 700, marginTop: 8 }}>
            No verses in practice — the queue fills your slots.
          </p>
        ) : (
          <div className='queue-slot-rows'>
            {slots.active.map((slot) => (
              <Link
                key={slot.userVerseId}
                to={`/verses/${slot.verseId}`}
                className='queue-slot-row'
              >
                <span className='queue-slot-dot' aria-hidden='true' />
                <span className='queue-slot-ref'>
                  {slot.reference ?? slot.verseId}
                </span>
                <span className='queue-slot-text'>
                  {truncate(textById.get(slot.verseId) ?? '')}
                </span>
                <span className='chip chip-active'>
                  {STAGE_SHORT_LABELS[slot.stage]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className='eyebrow queue-waiting-label'>Waiting in line</div>

      <ol className='queue-list' aria-label='Practice queue'>
        {ids.map((id, index) => {
          const verse = byId.get(id)
          if (!verse) return null
          return (
            <li key={id} className='queue-row'>
              <span className='queue-num' aria-hidden='true'>
                {index + 1}
              </span>
              <Link to={`/verses/${id}`} className='queue-row-main'>
                <span className='queue-row-head'>
                  <span className='queue-ref'>{verse.reference}</span>
                  <QueueChip verse={verse} />
                </span>
                <span className='queue-snippet'>{truncate(verse.text)}</span>
              </Link>
              <span className='queue-arrows'>
                <button
                  className='queue-arrow'
                  aria-label={`Move ${verse.reference} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ▲
                </button>
                <button
                  className='queue-arrow'
                  aria-label={`Move ${verse.reference} down`}
                  disabled={index === ids.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ▼
                </button>
              </span>
            </li>
          )
        })}
      </ol>

      {nextUp && (
        <p className='queue-refill-note'>
          Slots fill one at a time. Finish or swap out a verse and{' '}
          {nextUp.reference} takes its place.
        </p>
      )}

      <Sheet
        open={themeSheet}
        label='Bring a theme forward'
        onClose={() => setThemeSheet(false)}
        onExited={() => setThemePick(null)}
        footer={
          <>
            <button
              className='btn'
              disabled={busy || !pickedTheme || pickedTheme.queuedCount === 0}
              onClick={confirmTheme}
            >
              {pickedTheme
                ? pickedTheme.queuedCount === 0
                  ? 'Nothing from that theme is waiting'
                  : `Move ${pickedTheme.name} to the top`
                : 'Choose a theme'}
            </button>
            <button
              className='btn-quiet'
              style={{ width: '100%', marginTop: 6 }}
              onClick={() => setThemeSheet(false)}
            >
              Cancel
            </button>
          </>
        }
      >
        <h2 className='sheet-title'>Bring a theme forward</h2>
        <p className='sheet-copy'>
          Every waiting verse of that theme jumps to the front of the queue, in
          its own order. Everything else keeps its place behind them.
        </p>
        <div className='theme-list'>
          {themes.map((theme) => {
            const on = themePick === theme.id
            return (
              <button
                key={theme.id}
                className={on ? 'theme-option theme-option-on' : 'theme-option'}
                onClick={() => setThemePick(on ? null : theme.id)}
              >
                <span className='theme-option-main'>
                  <span className='theme-name'>{theme.name}</span>
                  <span className='theme-count'>
                    {theme.queuedCount} in queue
                  </span>
                </span>
                <span
                  className={on ? 'theme-mark theme-mark-on' : 'theme-mark'}
                  aria-hidden='true'
                >
                  {on ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </Sheet>
    </main>
  )
}
