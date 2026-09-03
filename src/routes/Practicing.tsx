import { api } from '../api/client'
import Screen from '../components/Screen'
import TranslationTag from '../components/TranslationTag'
import DueCard from '../components/practicing/DueCard'
import QueueLink from '../components/practicing/QueueLink'
import RelearnCard from '../components/practicing/RelearnCard'
import SlotList from '../components/practicing/SlotList'
import { combineApi, useApi } from '../hooks/useApi'

/**
 * The Practicing tab: the learning slots, plus what's coming back for review
 * in today's session.
 */
export default function Practicing() {
  const me = useApi(() => api.me())
  // Verse texts feed the slot-card snippets; the review-due card comes from
  // today's session.
  const verses = useApi(() => api.verses())
  const session = useApi(() => api.sessionToday())
  const all = combineApi(me, verses, session)

  // Hold every child to its skeleton until all three requests have settled,
  // so the slots, due card and queue count don't pop in one at a time.
  const ready = !all.pending
  const profile = ready ? me.data : null
  const verseList = ready ? (verses.data?.verses ?? null) : null
  const sessionToday = ready ? session.data : null

  return (
    <Screen
      layout='tabbed'
      title={<h1 className='view-title'>In Practice</h1>}
      trailing={<TranslationTag code={verses.data?.translation ?? null} />}
      sub='Three at a time. A verse graduates from In Practice once it’s practiced correctly three times in a row for three days.'
      loading={all.pending}
      loadingLabel='Loading your practice slots…'
      // Only the profile is load-bearing. A failed verse or session fetch
      // costs a snippet or a card, not the screen, so it isn't passed on.
      error={me.error}
      onRetry={all.refetch}
    >
      <SlotList profile={profile} verses={verseList} />
      <DueCard session={sessionToday} />
      <QueueLink verses={verseList} />
      <RelearnCard verses={verseList} />
    </Screen>
  )
}
