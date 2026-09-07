import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import Screen, { BackButton } from '../components/Screen'
import HistoryCard from '../components/verses/HistoryCard'
import ProgressCard from '../components/verses/ProgressCard'
import SlotPickerSheet from '../components/verses/SlotPickerSheet'
import SoonerCard from '../components/verses/SoonerCard'
import VerseCard from '../components/verses/VerseCard'
import { useApi } from '../hooks/useApi'
import { useBack } from '../hooks/useBack'
import { messageOf } from '../lib/errors'

/** One verse end to end: text, ladder position, attempts, and the way to pull
    it into practice while it is still queued. */
export default function VerseDetail() {
  const { id } = useParams<{ id: string }>()
  const back = useBack()
  const detail = useApi(() => api.verse(id ?? ''))
  const me = useApi(() => api.me())

  const [slotSheet, setSlotSheet] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const data = detail.data

  // The error clears on `onExited`, so it doesn't flicker away under the
  // sheet's exit animation.
  const closeSlotSheet = () => setSlotSheet(false)

  const confirmSlotAction = (verseId: string, pick: number) => {
    setActionBusy(true)
    setActionError(null)
    const action =
      pick === 0
        ? api.moveVerseToFront(verseId)
        : api.replaceSlot(verseId, pick)
    action
      .then(() => {
        closeSlotSheet()
        detail.refetch()
        me.refetch()
      })
      .catch((err: unknown) => {
        setActionError(messageOf(err, 'Something went wrong.'))
      })
      .finally(() => setActionBusy(false))
  }

  return (
    <Screen
      layout='stack'
      leading={<BackButton onClick={back} label='Back to verses' />}
      title={
        <span className='small muted' style={{ fontWeight: 800 }}>
          Verses
        </span>
      }
      loading={detail.pending}
      loadingLabel='Loading verse…'
      error={detail.error}
      onRetry={detail.refetch}
      errorActions={
        <button
          className='btn-quiet'
          style={{ width: '100%', marginTop: 8 }}
          onClick={back}
        >
          Back to verses
        </button>
      }
    >
      <VerseCard detail={data} />
      <SoonerCard
        position={data?.queuePosition ?? null}
        disabled={actionBusy || me.pending}
        error={actionError}
        onOpen={() => setSlotSheet(true)}
      />
      <ProgressCard detail={data} />
      <HistoryCard detail={data} />

      {data && (
        <SlotPickerSheet
          open={slotSheet}
          reference={data.verse.reference}
          slots={me.data?.slots.active ?? []}
          allowQueueFront={data.queuePosition !== 1}
          busy={actionBusy}
          error={actionError}
          onConfirm={(pick) => confirmSlotAction(data.verse.id, pick)}
          onClose={closeSlotSheet}
          onExited={() => setActionError(null)}
        />
      )}
    </Screen>
  )
}
