import { wordsMatch, wordsMatchExactly } from './exercise'

/**
 * The word bank's rolling window.
 *
 * A review exercise blanks every word, so its bank can run to 80+ tiles — far
 * more than the three rows docked at the bottom of the screen can hold. Rather
 * than scroll, the bank shows a window onto the tiles and rotates fresh ones in
 * as taps free up space. These are the pure moves; `useWordBank` measures the
 * DOM and decides when to make them.
 */

/** How many rows of tiles the dock shows. */
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

/**
 * Position within `tileIds` of the best tile for `answer`: one that spells
 * it exactly, or failing that a differently-capitalized variant, which taps
 * accept too. -1 when neither is there.
 */
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
 * the one that spells it. Trading their labels keeps what is left in the bank
 * matching the blanks that are left — otherwise "I AM WHO I AM" spends its
 * lowercase tile early and has none for "how I am to be remembered".
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

/** Sends tiles past `capacity` off screen, keeping `neededAnswer` in view. */
export function trimToCapacity(
  bank: BankWindow,
  capacity: number,
  labels: string[],
  neededAnswer: string | undefined,
): BankWindow {
  const onScreen = bank.onScreen.slice(0, capacity)
  const overflow = bank.onScreen.slice(capacity)

  if (
    neededAnswer !== undefined &&
    onScreen.length > 0 &&
    !includesSpellingOf(onScreen, labels, neededAnswer)
  ) {
    const rescue = positionOfBestTile(overflow, labels, neededAnswer)
    if (rescue !== -1) {
      const last = onScreen.length - 1
      ;[onScreen[last], overflow[rescue]] = [overflow[rescue], onScreen[last]]
    }
  }

  return { onScreen, offScreen: [...overflow, ...bank.offScreen] }
}

/** Swaps the tapped tile for an off-screen one that keeps play going. */
export function replaceTappedTile(
  bank: BankWindow,
  tappedPosition: number,
  upcomingAnswer: string | undefined,
  labels: string[],
): BankWindow {
  const remaining = bank.onScreen.filter((_, at) => at !== tappedPosition)
  if (bank.offScreen.length === 0) return { onScreen: remaining, offScreen: [] }

  let drawAt = 0
  if (
    upcomingAnswer !== undefined &&
    !includesSpellingOf(remaining, labels, upcomingAnswer)
  ) {
    const rescue = positionOfBestTile(bank.offScreen, labels, upcomingAnswer)
    if (rescue !== -1) drawAt = rescue
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

export function heightOfRows(container: HTMLElement, tile: HTMLElement): number {
  const rowGap = parseFloat(getComputedStyle(container).rowGap) || 0
  return BANK_ROWS * tile.offsetHeight + (BANK_ROWS - 1) * rowGap
}

export function countTilesInRows(tiles: HTMLElement[], rows: number): number {
  const rowTops = [...new Set(tiles.map((tile) => tile.offsetTop))].sort(
    (a, b) => a - b,
  )
  return tiles.filter((tile) => rowTops.indexOf(tile.offsetTop) < rows).length
}
