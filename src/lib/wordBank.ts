import { randomIndex, wordsMatch, wordsMatchExactly } from './exercise'

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

/**
 * Sends tiles past `capacity` off screen, keeping `neededAnswers` (the
 * current blank, then a lookahead buffer) in view from the start — the same
 * guarantee `replaceTappedTile` keeps up as taps roll the window forward.
 * Without this, only the very first blank was guaranteed visible at mount, so
 * the first several taps leaned on `replaceTappedTile`'s hard "rescue the
 * immediate answer" path far more than later ones did — exactly the path
 * that hands the answer away.
 */
export function trimToCapacity(
  bank: BankWindow,
  capacity: number,
  labels: string[],
  neededAnswers: readonly string[],
): BankWindow {
  const onScreen = bank.onScreen.slice(0, capacity)
  const overflow = bank.onScreen.slice(capacity)

  // Positions already spoken for this pass, whether by a pre-existing match
  // or a rescue below — a later, lower-priority rescue must never overwrite
  // one, or it would evict the tile an earlier answer just claimed.
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

/** How many blanks ahead to opportunistically pre-load a tile for, beyond
 *  the one the very next tap requires. Large enough that a freshly-drawn
 *  tile is rarely provably "the" answer; small enough it isn't half the
 *  verse. */
export const LOOKAHEAD_BLANKS = 6

/**
 * Swaps the tapped tile for an off-screen one that keeps play going. Only the
 * very next answer is a hard requirement — everything past it is drawn from
 * a random pick among the next `LOOKAHEAD_BLANKS` answers that aren't yet on
 * screen, rather than always the nearest one. Otherwise the tile rescued for
 * the immediate next answer (the common case in a review bank, where most of
 * it is off screen at any moment) would reliably be exactly the word the user
 * needs next, telling them the answer without their having to read it.
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

/**
 * Tile's box-shadow (the pressed lip) falls outside its offsetHeight, so the
 * bottom row's shadow needs this much extra room or `.word-bank`'s
 * `overflow: hidden` clips it.
 */
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
