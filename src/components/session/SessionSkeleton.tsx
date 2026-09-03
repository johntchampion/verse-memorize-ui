import { Skeleton, SkeletonText } from '../Skeleton'
import SessionHeader from './SessionHeader'

/** Tile widths for the word-bank placeholder — varied, so it reads as words. */
const SKELETON_TILES = [96, 68, 118, 82, 74, 104, 88, 70, 112]

/** Tile height, and the three-row window the bank locks itself to. */
const SKELETON_TILE_H = 53
const SKELETON_BANK_H = SKELETON_TILE_H * 3 + 11 * 2

/**
 * The session frame while today's exercises load. This is the longest wait in
 * the app — the session has to land before the verse texts can even be asked
 * for — so the whole runner is drawn up front: the exit, the progress rail at
 * zero, the verse card, and the dock. Only the words are missing.
 *
 * It mirrors TileExercise, the more common of the two exercise types; a typed
 * one still settles without a jump, since both share the card and the dock.
 */
export default function SessionSkeleton() {
  return (
    <main className='shell stack shell-full' aria-busy='true'>
      <span className='sr-only' role='status'>
        Preparing today&rsquo;s session…
      </span>

      <SessionHeader done={0} total={0} />

      <div className='exercise-pane'>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <Skeleton variant='chip' w={132} h={30} />
          <Skeleton variant='chip' w={110} h={30} />
        </div>

        <div className='verse-card'>
          <div className='verse-card-head'>
            <Skeleton variant='text' w='42%' h={13} />
            <Skeleton variant='chip' w={44} h={22} />
          </div>
          <SkeletonText lines={3} widths={['100%', '94%', '58%']} />
        </div>

        <div className='bank-dock'>
          <p className='bank-label'>Tap the missing words</p>
          <div
            className='word-bank'
            aria-hidden='true'
            style={{ height: SKELETON_BANK_H }}
          >
            {SKELETON_TILES.map((w, i) => (
              <Skeleton
                key={i}
                w={w}
                h={SKELETON_TILE_H}
                style={{ borderRadius: 16 }}
              />
            ))}
          </div>
          <button type='button' className='btn' style={{ marginTop: 20 }} disabled>
            Next verse →
          </button>
        </div>
      </div>
    </main>
  )
}
