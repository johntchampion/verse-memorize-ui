import type { MeResponse, SessionTodayResponse } from '../../api/types'
import { Skeleton } from '../Skeleton'

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
]

/** "make it thirteen" reads warmer than "make it 13"; digits past twenty. */
function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n)
}

/** What today asks of you, given the streak and what's still due. */
function heroCopy(
  profile: MeResponse,
  session: SessionTodayResponse,
): string {
  if (session.exercises.length === 0) return 'Done for today. Come back tomorrow.'
  if (profile.completedToday)
    return 'Streak’s in for today — extra practice never hurts.'
  if (profile.streak > 0)
    return `Practice today to make it ${numberWord(profile.streak + 1)}.`
  return 'Practice today to start your streak.'
}

/**
 * The streak circle and the line under it. The ring itself is chrome, not data,
 * so it is drawn from the first frame; only the number inside waits. The count
 * needs the profile alone, so it can land while the session is still in flight.
 */
export default function StreakHero({
  profile,
  session,
}: {
  profile: MeResponse | null
  session: SessionTodayResponse | null
}) {
  const copy = profile && session ? heroCopy(profile, session) : null

  return (
    <div className='streak-hero'>
      <div className='streak-hero-circle'>
        {profile ? (
          <>
            <span className='streak-hero-count'>{profile.streak}</span>
            <span className='streak-hero-label'>day streak</span>
          </>
        ) : (
          <>
            <Skeleton w={74} h={50} />
            <Skeleton variant='text' w={62} h={9} style={{ marginTop: 10 }} />
          </>
        )}
      </div>
      <p className='today-copy'>
        {/* A fixed width, not a percentage: .streak-hero is a centred flex
            column, so the paragraph shrinks to its content. */}
        {copy ?? (
          <Skeleton variant='text' w={244} style={{ margin: '0 auto' }} />
        )}
      </p>
    </div>
  )
}
