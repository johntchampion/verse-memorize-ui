/**
 * The offer to jump the queue, shown only for a verse that is actually waiting
 * in it — a non-null queue position means not memorized and not holding a slot.
 */
export default function SoonerCard({
  position,
  disabled,
  error,
  onOpen,
}: {
  position: number | null
  /** True while an action is in flight, or before the slots are known. */
  disabled: boolean
  error: string | null
  onOpen: () => void
}) {
  if (position === null) return null

  return (
    <section className='sooner-card' aria-label='Practice this sooner'>
      <div className='eyebrow' style={{ color: 'var(--amber-soft)' }}>
        Want it sooner?
      </div>
      <p className='sooner-copy'>
        {position === 1
          ? 'It’s next in the queue — it takes the first slot that frees up.'
          : `It’s #${position} in your queue. Put it straight into practice, or
             make it the next verse in.`}
      </p>
      {error && <p className='error-text'>{error}</p>}
      <button
        className='btn'
        style={{ marginTop: 13 }}
        onClick={onOpen}
        disabled={disabled}
      >
        Put it in a practice slot
      </button>
    </section>
  )
}
