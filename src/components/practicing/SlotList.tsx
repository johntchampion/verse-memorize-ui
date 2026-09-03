import type { MeResponse, VerseListItem } from '../../api/types'
import SlotRow, { SlotRowSkeleton } from '../SlotRow'
import { todayInTimezone } from '../../lib/dates'

/** Slots to stand in for before the profile says how many are open. */
const SKELETON_SLOTS = 3

/**
 * The three learning slots, filled, locked or pending. The verse list is only
 * for the snippets, so a slot draws without it.
 */
export default function SlotList({
  profile,
  verses,
}: {
  profile: MeResponse | null
  verses: VerseListItem[] | null
}) {
  const textById = new Map(verses?.map((v) => [v.id, v.text]) ?? [])

  return (
    <section
      className='stack'
      style={{ gap: 12, marginTop: 20 }}
      aria-label='Learning slots'
    >
      {profile
        ? Array.from({ length: profile.slots.max }, (_, i) => {
            const slot = i + 1
            const verse =
              profile.slots.active.find((v) => v.slot === slot) ?? null
            return (
              <SlotRow
                key={slot}
                slot={slot}
                verse={verse}
                unlocked={profile.slots.unlocked}
                snippet={verse ? (textById.get(verse.verseId) ?? null) : null}
                // Day boundaries follow the profile's timezone, not the
                // device's.
                today={todayInTimezone(profile.user.timezone)}
              />
            )
          })
        : Array.from({ length: SKELETON_SLOTS }, (_, i) => (
            <SlotRowSkeleton key={i} />
          ))}
    </section>
  )
}
