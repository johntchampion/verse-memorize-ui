import TasterVerse from './TasterVerse'

export default function HookStep({
  onTry,
  onSignIn,
}: {
  onTry: () => void
  onSignIn: () => void
}) {
  return (
    <main className='onboard-hero onboard-step'>
      <p className='onboard-brand'>Verse Memorize</p>
      <h1 className='onboard-title'>Memorize Bible Verses Every Day</h1>
      <p className='onboard-sub'>
        A curated path through 100 verses behind core Christian doctrine.
      </p>
      <div style={{ marginTop: 26 }}>
        <TasterVerse filled={0} showCurrent={false} />
      </div>
      <button className='btn' style={{ marginTop: 24 }} onClick={onTry}>
        Try it
      </button>
      <button className='btn-quiet' style={{ marginTop: 10 }} onClick={onSignIn}>
        I already have an account
      </button>
    </main>
  )
}
