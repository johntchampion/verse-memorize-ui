import type { MeResponse } from '../../api/types'
import { Skeleton } from '../Skeleton'

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })
}

/** Who you're signed in as. */
export default function AccountCard({
  user,
}: {
  user: MeResponse['user'] | null
}) {
  return (
    <section className='card' aria-label='Account'>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {user ? (
          <>
            <span className='avatar' aria-hidden='true'>
              {user.email.charAt(0).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  overflowWrap: 'anywhere',
                }}
              >
                {user.email}
              </div>
              <div
                className='small muted'
                style={{ fontWeight: 700, fontSize: '0.78rem' }}
              >
                Member since {memberSince(user.createdAt)}
              </div>
            </div>
          </>
        ) : (
          <>
            <Skeleton w={48} h={48} style={{ borderRadius: 16, flex: 'none' }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Skeleton variant='text' w='72%' h={14} />
              <Skeleton variant='text' w='44%' h={11} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
