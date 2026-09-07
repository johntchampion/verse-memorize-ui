import type { SessionExercise } from '../api/types'
import { BLANK, STAGE_SHORT_LABELS } from './exercise'

/**
 * Today's session, read as a path: one stop per exercise, in the order the
 * runner will take them. The order and the done/not-done are the server's; the
 * grouping is the one thing derived here.
 */

export type PathState = 'done' | 'current' | 'upcoming'

export interface PathNode {
  /** Position in the day's plan; also the number drawn in the circle. */
  index: number
  state: PathState
  /** Heading to draw above this stop, or null to continue the run above it. */
  group: string | null
  reference: string
  /** "Easy · 20 sec" — or "done" for a stop already behind you. */
  meta: string
}

export interface Path {
  nodes: PathNode[]
  done: number
  total: number
  /** The only stop that can be entered; -1 once the day's plan is finished. */
  currentIndex: number
  complete: boolean
  reviewCount: number
  roundCount: number
  secondsLeft: number
  next: PathNode | null
}

/** Rough seconds for one exercise; only ever shown rounded. */
const READ_SECONDS = 8
const SECONDS_PER_BLANK = 2.5

function estimateSeconds(exercise: SessionExercise): number {
  const blanks = exercise.blankedText.split(BLANK).length - 1
  return READ_SECONDS + SECONDS_PER_BLANK * blanks
}

function durationLabel(seconds: number): string {
  if (seconds >= 90) return `${Math.round(seconds / 60)} min`
  return `${Math.round(seconds / 5) * 5} sec`
}

export function minutesLabel(seconds: number): string {
  return `about ${Math.max(1, Math.round(seconds / 60))} min`
}

export function buildPath(exercises: SessionExercise[]): Path {
  // A verse's nth learning exercise is its nth round of the day; reviews come
  // back once each and carry the queue's own label instead.
  const rounds = new Map<string, number>()
  let previousGroup: string | null = null
  let reviewCount = 0
  let secondsLeft = 0
  let currentIndex = -1

  const nodes = exercises.map((exercise, index): PathNode => {
    let group: string
    if (exercise.queue === 'review') {
      group = 'Coming back today'
      reviewCount += 1
    } else {
      const round = (rounds.get(exercise.userVerseId) ?? 0) + 1
      rounds.set(exercise.userVerseId, round)
      group = `Round ${round}`
    }
    const heading = group === previousGroup ? null : group
    previousGroup = group

    if (!exercise.completed) {
      secondsLeft += estimateSeconds(exercise)
      if (currentIndex === -1) currentIndex = index
    }

    return {
      index,
      state: exercise.completed ? 'done' : 'upcoming',
      group: heading,
      reference: exercise.reference,
      meta: exercise.completed
        ? 'done'
        : `${STAGE_SHORT_LABELS[exercise.stage]} · ${durationLabel(estimateSeconds(exercise))}`,
    }
  })

  if (currentIndex !== -1) nodes[currentIndex].state = 'current'

  const done = exercises.filter((exercise) => exercise.completed).length
  return {
    nodes,
    done,
    total: exercises.length,
    currentIndex,
    complete: exercises.length > 0 && currentIndex === -1,
    reviewCount,
    roundCount: exercises.length - reviewCount,
    secondsLeft,
    next: currentIndex === -1 ? null : nodes[currentIndex],
  }
}
