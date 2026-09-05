import { useMemo, useState } from 'react'
import { api } from '../api/client'
import Alert from '../components/Alert'
import Screen, { BackButton } from '../components/Screen'
import { SkeletonText } from '../components/Skeleton'
import TranslationTag from '../components/TranslationTag'
import QueueList from '../components/queue/QueueList'
import QueueSlots from '../components/queue/QueueSlots'
import ThemeSheet from '../components/queue/ThemeSheet'
import { combineApi, useApi } from '../hooks/useApi'
import { useBack } from '../hooks/useBack'

/**
 * The practice queue: everything that hasn't been memorized and isn't in a
 * slot right now, in the order it will enter the slots. The user can nudge
 * verses up and down, pull a whole theme to the front, or reset to the default
 * order. Nothing here touches the slots directly — they refill themselves, one
 * at a time, as verses finish or get swapped out from a verse's detail view.
 */
export default function Queue() {
  const back = useBack()
  const me = useApi(() => api.me())
  const queue = useApi(() => api.queue())
  // Only for the snippets on the in-slot lines — those verses aren't in the
  // queue payload, so their text has to come from the verse list.
  const verses = useApi(() => api.verses())
  const all = combineApi(me, queue, verses)

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

  // Hold every child to its skeleton until all three requests have settled,
  // so the slots, waiting line and actions don't pop in one at a time.
  const ready = !all.pending
  const slotsData = ready ? (me.data?.slots ?? null) : null
  const verseList = ready ? (verses.data?.verses ?? null) : null
  const readyIds = ready ? ids : null
  const readyQueueData = ready ? queue.data : null

  const refreshAll = () => {
    all.refetch()
    setSaveError(null)
  }

  const move = (index: number, delta: number) => {
    if (!ids) return
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

  const confirmTheme = (themeId: string) => {
    setBusy(true)
    api
      .moveThemeToTop(themeId)
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

  // Three states for the lead paragraph: pending, an order to describe, or a
  // failure that still deserves a line saying what the screen is.
  const sub = all.pending ? (
    <SkeletonText lines={2} widths={['100%', '62%']} />
  ) : queue.data ? (
    customized
      ? 'Your order. Whenever a slot frees up, the verse at the top of the line moves in.'
      : 'Default order — the arc, front to back. Nudge any verse up to practice it sooner.'
  ) : (
    'Everything waiting to enter your practice slots.'
  )

  const nextUp =
    readyIds && readyIds.length > 0 ? byId.get(readyIds[0]) : undefined

  return (
    <Screen
      leading={<BackButton onClick={back} label='Back' />}
      title={<h1>Up Next</h1>}
      trailing={<TranslationTag code={queue.data?.translation ?? null} />}
      sub={sub}
      subStyle={{ marginTop: 10 }}
      loading={all.pending}
      loadingLabel='Loading your queue…'
      // The verse list only carries snippets, so its failure isn't the
      // screen's.
      error={me.error ?? queue.error}
      onRetry={all.refetch}
    >
      <div className='queue-actions'>
        <button
          className='btn-ghost queue-action'
          onClick={() => setThemeSheet(true)}
          disabled={busy || !readyIds}
        >
          Move a theme to top
        </button>
        <button
          className='btn-ghost queue-action'
          onClick={resetOrder}
          disabled={busy || !customized || !readyIds}
        >
          Restore default order
        </button>
      </div>

      <QueueSlots slots={slotsData} verses={verseList} />

      <div className='eyebrow queue-waiting-label'>Waiting in line</div>

      <QueueList ids={readyIds} byId={byId} onMove={move} />

      {nextUp && (
        <p className='queue-refill-note'>
          Slots fill one at a time. Finish or swap out a verse and{' '}
          {nextUp.reference} takes its place.
        </p>
      )}

      {readyQueueData && (
        <ThemeSheet
          open={themeSheet}
          themes={readyQueueData.themes}
          busy={busy}
          onConfirm={confirmTheme}
          onClose={() => setThemeSheet(false)}
        />
      )}

      <Alert
        open={saveError !== null}
        title='Something went wrong'
        message={saveError ?? ''}
        tone='warning'
        primaryLabel='OK'
        onPrimary={() => setSaveError(null)}
        onClose={() => setSaveError(null)}
      />
    </Screen>
  )
}
