import { api } from '../api/client'
import Screen from '../components/Screen'
import TranslationTag from '../components/TranslationTag'
import ArcList from '../components/verses/ArcList'
import HundredStats from '../components/verses/HundredStats'
import { useApi } from '../hooks/useApi'

/**
 * The All tab: every verse in the arc, in order — memorized ones green, the
 * rest waiting their turn.
 */
export default function AllVerses() {
  const verses = useApi(() => api.verses())

  return (
    <Screen
      layout='tabbed'
      title={<h1 className='view-title'>The Hundred</h1>}
      trailing={<TranslationTag code={verses.data?.translation ?? null} />}
      sub='Every verse in the curriculum, in canon order.'
      loading={verses.pending}
      loadingLabel='Loading verses…'
      error={verses.error}
      onRetry={verses.refetch}
    >
      <HundredStats verses={verses.data?.verses ?? null} />
      <ArcList verses={verses.data?.verses ?? null} />
    </Screen>
  )
}
