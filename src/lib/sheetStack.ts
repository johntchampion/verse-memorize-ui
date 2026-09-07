export interface SheetLayer {
  overlay: HTMLElement
  /** Recede, because another sheet has just opened over this one. */
  cover: (covered: boolean) => void
}

/**
 * Every mounted sheet, deepest first. Sheets portal to the body, so `inert` on
 * the app root says nothing about them: a sheet opened over another has to
 * silence the one it covers itself, and only the top of the stack owns Escape.
 */
const stack: SheetLayer[] = []

export const stackDepth = () => stack.length

export const topLayer = (): SheetLayer | undefined => stack[stack.length - 1]

export const isTopLayer = (overlay: HTMLElement | null): boolean =>
  stack.length > 0 && stack[stack.length - 1].overlay === overlay

export function pushLayer(layer: SheetLayer): void {
  stack.push(layer)
}

export function removeLayer(overlay: HTMLElement): void {
  const at = stack.findIndex((layer) => layer.overlay === overlay)
  if (at !== -1) stack.splice(at, 1)
}
