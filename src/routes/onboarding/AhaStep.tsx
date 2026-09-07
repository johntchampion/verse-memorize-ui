import StageLadder from '../../components/StageLadder'

/** The explainer: what just happened, and where it leads. */
export default function AhaStep({ onContinue }: { onContinue: () => void }) {
  return (
    <main className='complete-screen onboard-step'>
      <div className='onboard-center' style={{ alignItems: 'center' }}>
        <div className='onboard-check' aria-hidden='true'>
          <span>✓</span>
        </div>
        <h1 className='complete-title'>
          You just practiced
          <br />
          your first verse!
        </h1>
        <p className='complete-sub' style={{ textWrap: 'pretty' }}>
          That&rsquo;s all it takes — a few minutes a day. Keep going, and
          you&rsquo;ll know all 100 by heart.
        </p>

        <div className='onboard-how'>
          <p className='eyebrow' style={{ color: 'var(--amber-soft)' }}>
            The path to memorized
          </p>
          <StageLadder stage='learning_light' />
          <p
            className='small muted'
            style={{ fontWeight: 600, marginTop: 12, lineHeight: 1.45 }}
          >
            Hints fade as you improve, until you recite it unaided. Occasional
            check-ins keep it stuck after that.
          </p>
        </div>
      </div>

      <button className='btn' style={{ marginTop: 22 }} onClick={onContinue}>
        Start verse one →
      </button>
    </main>
  )
}
