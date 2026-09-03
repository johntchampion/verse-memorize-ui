import type { UserVerse, VerseDetailResponse } from '../../api/types'
import StageLadder from '../StageLadder'
import {
  REVIEW_ADVANCE_THRESHOLD,
  REVIEW_DEMOTION_THRESHOLD,
  STAGE_LABELS,
  TIER_ADVANCE_THRESHOLD,
  TIER_DOWNGRADE_THRESHOLD,
  isLearningStage,
} from '../../lib/exercise'

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function chipClass(userVerse: UserVerse): string {
  if (userVerse.needs_relearning === 1) return 'chip chip-relearn'
  if (userVerse.stage === 'mastered') return 'chip chip-mastered'
  if (userVerse.stage === 'review') return 'chip chip-review'
  return 'chip chip-active'
}

/**
 * What this verse needs next, in the terms the state machine actually uses:
 * consecutive-answer runs, not a score.
 */
function progressCopy(userVerse: UserVerse): string {
  const { consecutive_correct: right, consecutive_incorrect: wrong } = userVerse

  if (userVerse.needs_relearning === 1) {
    return 'Missed twice in review, so it comes back to heavy blanks as soon as a slot opens.'
  }

  if (isLearningStage(userVerse.stage)) {
    // The advancing run has to fit inside one calendar day, so a run from an
    // earlier day is already dead as far as the server is concerned.
    const live = userVerse.streak_date !== null
    if (wrong > 0) {
      const left = TIER_DOWNGRADE_THRESHOLD - wrong
      return `${wrong} missed in a row — ${left} more drops it a tier. Three right in one day moves it up.`
    }
    return live
      ? `${right} of ${TIER_ADVANCE_THRESHOLD} right in a row today. All three in one day moves it up a tier.`
      : `Three right in a row within one day moves it up a tier — the run resets each morning.`
  }

  if (userVerse.stage === 'mastered') {
    return 'Fully memorized, at the top of the ladder. It still comes back every 30 days; one miss sends it to review.'
  }

  if (wrong > 0) {
    const left = REVIEW_DEMOTION_THRESHOLD - wrong
    return `${wrong} failed review — ${left} more and it returns to practice at heavy blanks.`
  }
  return `${right} of ${REVIEW_ADVANCE_THRESHOLD} correct reviews toward the next, longer interval.`
}

/**
 * Where this verse sits on the ladder and what moves it. Absent entirely until
 * the verse has been started — there is no progress to place.
 */
export default function ProgressCard({
  detail,
}: {
  detail: VerseDetailResponse | null
}) {
  const userVerse = detail?.userVerse
  if (!detail || !userVerse) return null

  const { status, schedule, graduatedAt } = detail
  const parked = userVerse.needs_relearning === 1

  return (
    <section className='card' aria-label='Progress'>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span className='eyebrow'>Progress</span>
        <span className={chipClass(userVerse)}>
          {parked ? 'Relearning' : STAGE_LABELS[userVerse.stage]}
        </span>
      </div>
      <StageLadder stage={userVerse.stage} />

      <p
        className='small muted'
        style={{ fontWeight: 600, marginTop: 12, lineHeight: 1.45 }}
      >
        {progressCopy(userVerse)}
      </p>

      {(schedule || graduatedAt || parked) && status !== 'not_started' && (
        <div className='stat-tiles' style={{ marginTop: 14 }}>
          {parked ? (
            // Queued for relearning: unscheduled by design, so there is no
            // next-review date to show until a slot picks it up.
            <div className='stat-tile'>
              <div className='stat-tile-value'>Waiting</div>
              <div className='stat-tile-label'>for a slot</div>
            </div>
          ) : (
            schedule && (
              <>
                <div className='stat-tile'>
                  <div className='stat-tile-value'>
                    {formatDay(`${schedule.dueAt}T00:00:00`)}
                  </div>
                  <div className='stat-tile-label'>next review</div>
                </div>
                {schedule.intervalDays !== null && (
                  <div className='stat-tile'>
                    <div className='stat-tile-value'>
                      Every {schedule.intervalDays}{' '}
                      {schedule.intervalDays === 1 ? 'day' : 'days'}
                    </div>
                    <div className='stat-tile-label'>interval</div>
                  </div>
                )}
              </>
            )
          )}
          {graduatedAt && (
            <div className='stat-tile'>
              <div className='stat-tile-value'>{formatDay(graduatedAt)}</div>
              <div className='stat-tile-label'>graduated</div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
