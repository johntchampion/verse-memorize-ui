import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { UserVerse } from '../api/types'
import Sheet from '../components/Sheet'
import StageLadder from '../components/StageLadder'
import TranslationTag from '../components/TranslationTag'
import {
  REVIEW_ADVANCE_THRESHOLD,
  REVIEW_DEMOTION_THRESHOLD,
  STAGE_LABELS,
  TIER_ADVANCE_THRESHOLD,
  TIER_DOWNGRADE_THRESHOLD,
  isLearningStage,
} from '../lib/exercise'
import { useApi } from '../hooks/useApi'

const RECENT_ATTEMPTS_SHOWN = 10

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

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

export default function VerseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi(() => api.verse(id ?? ''))
  // Slot occupants, for the "put it in a practice slot" picker.
  const me = useApi(() => api.me())

  const [slotSheet, setSlotSheet] = useState(false)
  // 1-3 = replace that slot; 0 = no slot, just make it next in the queue.
  const [slotPick, setSlotPick] = useState<number | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Only the first load takes over the screen. A refresh after an action
  // keeps the current view up, so the sheet can play its exit over it.
  if (loading && !data) {
    return (
      <main className='shell'>
        <p className='muted'>Loading…</p>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className='shell stack'>
        <p className='error-text'>{error ?? 'Something went wrong.'}</p>
        <button className='btn-ghost' onClick={refetch}>
          Try again
        </button>
        <button className='btn-ghost' onClick={() => navigate(-1)}>
          Back to verses
        </button>
      </main>
    )
  }

  const {
    verse,
    translation,
    status,
    userVerse,
    schedule,
    history,
    graduatedAt,
  } = data
  const parked = userVerse?.needs_relearning === 1
  const recent = history.attempts.slice(0, RECENT_ATTEMPTS_SHOWN)
  // Attempts arrive newest first; the block strip reads oldest → newest.
  const blocks = [...recent].reverse()

  // A non-null queue position means the verse is waiting its turn — not
  // memorized, not holding a slot — so it can jump the line.
  const queued = data.queuePosition !== null

  // The pick and any error clear on the sheet's `onExited`, so they don't
  // flicker away underneath the exit animation.
  const closeSlotSheet = () => setSlotSheet(false)

  const confirmSlotAction = () => {
    if (slotPick === null || !verse) return
    setActionBusy(true)
    setActionError(null)
    const action =
      slotPick === 0
        ? api.moveVerseToFront(verse.id)
        : api.replaceSlot(verse.id, slotPick)
    action
      .then(() => {
        closeSlotSheet()
        refetch()
        me.refetch()
      })
      .catch((err: unknown) => {
        setActionError(
          err instanceof Error ? err.message : 'Something went wrong.',
        )
      })
      .finally(() => setActionBusy(false))
  }

  return (
    <main className='shell stack'>
      <header className='screen-header' style={{ marginBottom: 0 }}>
        <button
          className='icon-btn'
          aria-label='Back to verses'
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <span className='small muted' style={{ fontWeight: 800 }}>
          Verses
        </span>
      </header>

      <section className='verse-card'>
        <div className='verse-card-head'>
          <p className='verse-ref'>{verse.reference}</p>
          {verse.text && <TranslationTag code={translation} />}
        </div>
        <p className='verse-text' style={{ lineHeight: 1.7 }}>
          {verse.text}
        </p>
        {data.themes.length > 0 && (
          <p
            className='small muted'
            style={{ fontWeight: 700, marginTop: 12 }}
          >
            {data.themes.map((t) => t.name).join(' · ')}
          </p>
        )}
      </section>

      {queued && (
        <section className='sooner-card' aria-label='Practice this sooner'>
          <div className='eyebrow' style={{ color: 'var(--amber-soft)' }}>
            Want it sooner?
          </div>
          <p className='sooner-copy'>
            {data.queuePosition === 1
              ? 'It’s next in the queue — it takes the first slot that frees up.'
              : `It’s #${data.queuePosition} in your queue. Put it straight into
                practice, or make it the next verse in.`}
          </p>
          {actionError && <p className='error-text'>{actionError}</p>}
          <button
            className='btn'
            style={{ marginTop: 13 }}
            onClick={() => setSlotSheet(true)}
            disabled={actionBusy}
          >
            Put it in a practice slot
          </button>
        </section>
      )}

      {userVerse && (
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
                  <div className='stat-tile-value'>
                    {formatDay(graduatedAt)}
                  </div>
                  <div className='stat-tile-label'>graduated</div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {history.total > 0 && (
        <section className='card' aria-label='Attempt history'>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <span className='eyebrow'>History</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
              {history.correct} of {history.total} ·{' '}
              {Math.round((history.correct / history.total) * 100)}%
            </span>
          </div>
          <div className='history-blocks' aria-hidden='true'>
            {blocks.map((attempt) => (
              <span
                key={attempt.id}
                className={
                  attempt.correct === 1
                    ? 'history-block history-block-correct'
                    : 'history-block history-block-incorrect'
                }
              />
            ))}
          </div>
          {blocks.length > 0 && (
            <div
              className='small muted'
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                fontWeight: 700,
                fontSize: '0.72rem',
              }}
            >
              <span>{formatDay(blocks[0].created_at)}</span>
              <span>most recent</span>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            {recent.map((attempt) => (
              <div key={attempt.id} className='attempt-row'>
                <span
                  className={
                    attempt.correct === 1
                      ? 'attempt-correct'
                      : 'attempt-incorrect'
                  }
                >
                  {attempt.correct === 1 ? '✓ Correct' : '✗ Missed'}
                </span>
                <span className='muted'>
                  {attempt.exercise_type === 'tile_fill_blank'
                    ? ''
                    : '👑 '}
                  {formatDate(attempt.created_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Sheet
        open={slotSheet}
        label={`Put ${verse.reference} into practice`}
        onClose={closeSlotSheet}
        onExited={() => {
          setSlotPick(null)
          setActionError(null)
        }}
        footer={
          <>
            {actionError && <p className='error-text'>{actionError}</p>}
            <button
              className='btn'
              disabled={actionBusy || slotPick === null}
              onClick={confirmSlotAction}
            >
              {slotPick === null
                ? 'Choose one'
                : slotPick === 0
                  ? 'Make it next in the queue'
                  : `Swap it into slot ${slotPick}`}
            </button>
            <button
              className='btn-quiet'
              style={{ width: '100%', marginTop: 6 }}
              onClick={closeSlotSheet}
            >
              Cancel
            </button>
          </>
        }
      >
        <h2 className='sheet-title'>
          Which verse steps aside for {verse.reference}?
        </h2>
        <p className='sheet-copy'>
          Whichever you choose keeps its progress and comes back as the next
          verse in the queue.
        </p>
        <div className='theme-list'>
          {(me.data?.slots.active ?? []).map((slot) => {
            const on = slotPick === slot.slot
            return (
              <button
                key={slot.userVerseId}
                className={on ? 'theme-option theme-option-on' : 'theme-option'}
                onClick={() => setSlotPick(on ? null : slot.slot)}
              >
                <span className='theme-option-main'>
                  <span className='theme-name'>
                    {slot.reference ?? slot.verseId}
                  </span>
                  <span className='theme-count'>{STAGE_LABELS[slot.stage]}</span>
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
          {data.queuePosition !== 1 && (
            <button
              className={
                slotPick === 0
                  ? 'theme-option theme-option-alt theme-option-on'
                  : 'theme-option theme-option-alt'
              }
              onClick={() => setSlotPick(slotPick === 0 ? null : 0)}
            >
              <span className='theme-option-main'>
                <span className='theme-name'>
                  None — put it first in the queue
                </span>
                <span className='theme-count'>
                  Keeps all three going; starts the moment a slot frees up
                </span>
              </span>
              <span
                className={
                  slotPick === 0 ? 'theme-mark theme-mark-on' : 'theme-mark'
                }
                aria-hidden='true'
              >
                {slotPick === 0 ? '✓' : ''}
              </span>
            </button>
          )}
        </div>
      </Sheet>
    </main>
  )
}
