import type { VerseDetailResponse } from '../../api/types'
import { Skeleton, SkeletonText } from '../Skeleton'
import TranslationTag from '../TranslationTag'

/**
 * The verse itself: reference, translation tag, text, themes. The only block on
 * the detail screen that always exists, so it is also the only one that stands
 * in for itself while the fetch is out — everything below depends on whether
 * the verse has been started at all, and a placeholder there would promise a
 * card that may never arrive.
 */
export default function VerseCard({
  detail,
}: {
  detail: VerseDetailResponse | null
}) {
  if (!detail) {
    return (
      <section className='verse-card'>
        <div className='verse-card-head'>
          <Skeleton variant='text' w='46%' h={19} />
          <Skeleton variant='chip' w={44} h={22} />
        </div>
        <SkeletonText
          lines={4}
          widths={['100%', '96%', '100%', '58%']}
          style={{ marginTop: 12 }}
        />
      </section>
    )
  }

  const { verse, translation, themes } = detail
  return (
    <section className='verse-card'>
      <div className='verse-card-head'>
        <p className='verse-ref'>{verse.reference}</p>
        {verse.text && <TranslationTag code={translation} />}
      </div>
      <p className='verse-text' style={{ lineHeight: 1.7 }}>
        {verse.text}
      </p>
      {themes.length > 0 && (
        <p className='small muted' style={{ fontWeight: 700, marginTop: 12 }}>
          {themes.map((t) => t.name).join(' · ')}
        </p>
      )}
    </section>
  )
}
