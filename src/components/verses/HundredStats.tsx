import type { VerseListItem } from '../../api/types'
import { Skeleton } from '../Skeleton'
import { isMemorized } from '../../lib/verses'

/**
 * The one-line tally above the arc, and the bar that shows the same numbers as
 * a share of the hundred. The bar's track renders either way, so the card keeps
 * its height and only the fills arrive.
 */
export default function HundredStats({
  verses,
}: {
  verses: VerseListItem[] | null
}) {
  const total = verses?.length ?? 0
  const memorized = verses?.filter(isMemorized).length ?? 0
  const practicing = verses?.filter((v) => v.status === 'active').length ?? 0

  return (
    <div className='card' style={{ marginTop: 18, padding: '16px 18px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        {verses ? (
          <>
            <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>
              {memorized} memorized · {practicing} in practice
            </span>
            <span className='small muted' style={{ fontWeight: 700 }}>
              of {total}
            </span>
          </>
        ) : (
          <>
            <Skeleton variant='text' w={168} h={13} />
            <Skeleton variant='text' w={44} h={12} />
          </>
        )}
      </div>
      <div className='hundred-bar' aria-hidden='true'>
        {verses && (
          <>
            <span
              className='hundred-bar-memorized'
              style={{ width: `${(memorized / total) * 100}%` }}
            />
            <span
              className='hundred-bar-practicing'
              style={{ width: `${(practicing / total) * 100}%` }}
            />
          </>
        )}
      </div>
    </div>
  )
}
