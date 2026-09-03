import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import TabBar from './TabBar'

/**
 * The frame every data screen shares: the shell, the header row, the busy
 * announcement, and the error state. It exists so a route file can be read for
 * what the screen *is* — a header and a list of blocks — without the chrome and
 * the failure path in the way.
 *
 * It deliberately knows nothing about loading *content*. Each block below it
 * takes its data as a nullable prop and draws its own placeholder, so the frame
 * paints on the first frame and never tears down.
 */

type Layout = 'plain' | 'stack' | 'tabbed'

const SHELL: Record<Layout, string> = {
  plain: 'shell',
  stack: 'shell stack',
  tabbed: 'shell shell-tabbed',
}

interface Props {
  layout?: Layout
  /** Extra class on the shell, e.g. Today's full-height `today-shell`. */
  className?: string

  /** Start of the header row: a back control, or Today's wordmark. */
  leading?: ReactNode
  /** The route supplies its own heading element — the class is a real design
      distinction between the tab titles and the pushed-screen ones. */
  title?: ReactNode
  /** End of the header row: the translation tag, the settings icon. */
  trailing?: ReactNode
  /** The lead paragraph under the header. */
  sub?: ReactNode
  subStyle?: CSSProperties

  /** First load only. Drives `aria-busy` and the one announcement per screen. */
  loading?: boolean
  loadingLabel?: string

  /** Non-null replaces the children with the retry block. */
  error?: string | null
  onRetry?: () => void
  /** Extra controls under the retry button, e.g. VerseDetail's "Back". */
  errorActions?: ReactNode
  /** Wrapper for the error block; Today centres it in its hero. */
  errorClassName?: string
  errorStyle?: CSSProperties

  children: ReactNode
}

export default function Screen({
  layout = 'plain',
  className,
  leading,
  title,
  trailing,
  sub,
  subStyle,
  loading = false,
  loadingLabel,
  error = null,
  onRetry,
  errorActions,
  errorClassName = 'stack',
  errorStyle = { marginTop: 20 },
  children,
}: Props) {
  const shell = className ? `${SHELL[layout]} ${className}` : SHELL[layout]
  const hasHeader = leading || title || trailing

  const main = (
    <main className={shell} aria-busy={loading}>
      {hasHeader && (
        <header className='screen-header' style={{ marginBottom: 0 }}>
          {leading}
          {title}
          <span style={{ flex: 1 }} />
          {trailing}
        </header>
      )}

      {sub !== undefined && (
        <p className='view-sub' style={subStyle}>
          {sub}
        </p>
      )}

      {/* One announcement for the whole screen; the placeholders themselves
          are all aria-hidden. */}
      {loading && loadingLabel && (
        <span className='sr-only' role='status'>
          {loadingLabel}
        </span>
      )}

      {error !== null ? (
        <div className={errorClassName} style={errorStyle}>
          <p className='error-text'>{error}</p>
          {onRetry && (
            <button className='btn-ghost' onClick={onRetry}>
              Try again
            </button>
          )}
          {errorActions}
        </div>
      ) : (
        children
      )}
    </main>
  )

  if (layout !== 'tabbed') return main
  return (
    <>
      {main}
      <TabBar />
    </>
  )
}

/** The back arrow that pops history. */
export function BackButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button className='icon-btn' aria-label={label} onClick={onClick}>
      ←
    </button>
  )
}

/** The back arrow that navigates somewhere fixed. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className='icon-btn' aria-label={label}>
      ←
    </Link>
  )
}
