import type { CSSProperties } from 'react'

type Variant = 'block' | 'text' | 'circle' | 'chip'

interface Props {
  /** Width: a number is px, a string is passed through (`'60%'`, `'8ch'`). */
  w?: number | string
  /** Height: px or CSS. Omit on `text`, which sizes itself off the font. */
  h?: number | string
  variant?: Variant
  className?: string
  style?: CSSProperties
}

/** Always hidden from assistive tech: the loading state is announced once per
    region instead, by the `sr-only` status lines in Screen. */
export function Skeleton({
  w,
  h,
  variant = 'block',
  className,
  style,
}: Props) {
  const classes = ['sk']
  if (variant !== 'block') classes.push(`sk-${variant}`)
  if (className) classes.push(className)
  return (
    <span
      className={classes.join(' ')}
      aria-hidden='true'
      style={{ width: w, height: h, ...style }}
    />
  )
}

/** Widths for the trailing line, so a paragraph ends ragged rather than flush. */
const LAST_LINE = '62%'

/** `widths` overrides the default full-width-until-last shape. */
export function SkeletonText({
  lines = 3,
  widths,
  className,
  style,
}: {
  lines?: number
  widths?: (number | string)[]
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={className}
      aria-hidden='true'
      style={{ display: 'flex', flexDirection: 'column', ...style }}
    >
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          variant='text'
          w={widths?.[i] ?? (i === lines - 1 ? LAST_LINE : '100%')}
        />
      ))}
    </span>
  )
}
