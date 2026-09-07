import { randomIndex, wordsMatch, wordsMatchExactly } from './exercise'

/**
 * A review exercise blanks every word, so its bank can run to 80+ tiles — more
 * than the three docked rows hold. These are the pure window moves; the caller
 * measures the DOM and decides when to make them.
 */

export const BANK_ROWS = 3

/** Tiles on screen, plus the ones that didn't fit and await a slot. */
export interface BankWindow {
  onScreen: number[]
  offScreen: number[]
}

function includesSpellingOf(
  tileIds: number[],
  labels: string[],
  answer: string,
): boolean {
  return tileIds.some((id) => wordsMatchExactly(labels[id], answer))
}

/** Position of an exact spelling, or failing that a differently-capitalized
    variant, which taps accept too. -1 when neither is there. */
function positionOfBestTile(
  tileIds: number[],
  labels: string[],
  answer: string,
): number {
  const exact = tileIds.findIndex((id) => wordsMatchExactly(labels[id], answer))
  if (exact !== -1) return exact
  return tileIds.findIndex((id) => wordsMatch(labels[id], answer))
}

/**
 * Taps accept any capitalization, so the tile tapped for `answer` may not be
 * the one that spells it. Trading their labels keeps the remaining bank
 * matching the remaining blanks — otherwise "I AM WHO I AM" spends its
 * lowercase tile early and has none left for "how I am to be remembered".
 */
export function withAnswerSpelling(
  labels: string[],
  tappedId: number,
  answer: string,
  availableIds: number[],
): string[] {
  if (wordsMatchExactly(labels[tappedId], answer)) return labels
  const partner = availableIds.find(
    (id) => id !== tappedId && wordsMatchExactly(labels[id], answer),
  )
  if (partner === undefined) return labels

  const traded = [...labels]
  ;[traded[tappedId], traded[partner]] = [traded[partner], traded[tappedId]]
  return traded
}

/**
 * Sends tiles past `capacity` off screen, keeping `neededAnswers` in view from
 * the start so the opening taps don't lean on `replaceTappedTile`'s rescue
 * path — the one that hands the answer away.
 */
export function trimToCapacity(
  bank: BankWindow,
  capacity: number,
  labels: string[],
  neededAnswers: readonly string[],
): BankWindow {
  const onScreen = bank.onScreen.slice(0, capacity)
  const overflow = bank.onScreen.slice(capacity)

  // Positions already spoken for this pass; a later, lower-priority rescue must
  // not evict the tile an earlier answer just claimed.
  const claimed = new Set<number>()
  let slot = onScreen.length - 1

  for (const answer of neededAnswers) {
    const already = onScreen.findIndex(
      (id, at) => !claimed.has(at) && wordsMatchExactly(labels[id], answer),
    )
    if (already !== -1) {
      claimed.add(already)
      continue
    }

    while (slot >= 0 && claimed.has(slot)) slot--
    if (slot < 0) break

    const rescue = positionOfBestTile(overflow, labels, answer)
    if (rescue === -1) continue

    ;[onScreen[slot], overflow[rescue]] = [overflow[rescue], onScreen[slot]]
    claimed.add(slot)
    slot--
  }

  return { onScreen, offScreen: [...overflow, ...bank.offScreen] }
}

/** Large enough that a freshly-drawn tile is rarely provably "the" answer;
    small enough it isn't half the verse. */
export const LOOKAHEAD_BLANKS = 6

/**
 * Swaps the tapped tile for an off-screen one. Only the immediate next answer
 * is a hard requirement; past it the draw is random among the lookahead, so the
 * rescued tile isn't reliably the word the user needs next.
 */
export function replaceTappedTile(
  bank: BankWindow,
  tappedPosition: number,
  upcomingAnswers: readonly string[],
  labels: string[],
): BankWindow {
  const remaining = bank.onScreen.filter((_, at) => at !== tappedPosition)
  if (bank.offScreen.length === 0) return { onScreen: remaining, offScreen: [] }

  const [immediate, ...lookahead] = upcomingAnswers
  let drawAt = 0

  if (
    immediate !== undefined &&
    !includesSpellingOf(remaining, labels, immediate)
  ) {
    const rescue = positionOfBestTile(bank.offScreen, labels, immediate)
    if (rescue !== -1) drawAt = rescue
  } else {
    const missing = lookahead
      .filter((answer) => !includesSpellingOf(remaining, labels, answer))
      .map((answer) => positionOfBestTile(bank.offScreen, labels, answer))
      .filter((position) => position !== -1)
    if (missing.length > 0) drawAt = missing[randomIndex(missing.length)]
  }

  const onScreen = [...bank.onScreen]
  onScreen[tappedPosition] = bank.offScreen[drawAt]
  const offScreen = bank.offScreen.filter((_, at) => at !== drawAt)
  return { onScreen, offScreen }
}

export function showOneMoreTile(bank: BankWindow): BankWindow {
  return {
    onScreen: [...bank.onScreen, bank.offScreen[0]],
    offScreen: bank.offScreen.slice(1),
  }
}

/** The pressed lip falls outside offsetHeight, so the bottom row needs this
    much extra or `.word-bank`'s `overflow: hidden` clips it. */
const TILE_SHADOW_HEIGHT = 3

export function heightOfRows(
  container: HTMLElement,
  tile: HTMLElement,
): number {
  const rowGap = parseFloat(getComputedStyle(container).rowGap) || 0
  return (
    BANK_ROWS * tile.offsetHeight +
    (BANK_ROWS - 1) * rowGap +
    TILE_SHADOW_HEIGHT
  )
}

export function countTilesInRows(tiles: HTMLElement[], rows: number): number {
  const rowTops = [...new Set(tiles.map((tile) => tile.offsetTop))].sort(
    (a, b) => a - b,
  )
  return tiles.filter((tile) => rowTops.indexOf(tile.offsetTop) < rows).length
}
