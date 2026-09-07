import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from './Alert'
import TabBar from './TabBar'

/**
 * The frame every data screen shares. It knows nothing about loading *content*:
 * each block takes its data as a nullable prop and draws its own placeholder,
 * so the frame paints immediately and never tears down.
 */

type Layout = 'plain' | 'stack' | 'tabbed'

const SHELL: Record<Layout, string> = {
  plain: 'shell',
  stack: 'shell stack',
  tabbed: 'shell shell-tabbed',
}

interface Props {
  layout?: Layout
  className?: string

  leading?: ReactNode
  /** The route supplies its own heading element: tab titles and pushed-screen
      titles are a real design distinction. */
  title?: ReactNode
  trailing?: ReactNode
  sub?: ReactNode
  subStyle?: CSSProperties

  /** First load only. Drives `aria-busy` and one announcement per screen. */
  loading?: boolean
  loadingLabel?: string

  /** Non-null opens the alert; the children stay put underneath. */
  error?: string | null
  onRetry?: () => void
  errorActions?: ReactNode

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
  children,
}: Props) {
  const shell = className ? `${SHELL[layout]} ${className}` : SHELL[layout]
  const hasHeader = leading || title || trailing

  // The error lives in the caller's hook, so a dismissal has to be remembered
  // here or the alert pops straight back open on the next render.
  const [dismissed, setDismissed] = useState<string | null>(null)
  const dismiss = () => setDismissed(error)

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

      {loading && loadingLabel && (
        <span className='sr-only' role='status'>
          {loadingLabel}
        </span>
      )}

      {children}

      <Alert
        open={error !== null && error !== dismissed}
        title='Something went wrong'
        message={error ?? ''}
        tone='warning'
        primaryLabel={onRetry ? 'Try again' : 'OK'}
        onPrimary={onRetry ?? dismiss}
        // A route with its own way out doesn't need the generic dismiss too.
        secondaryLabel={onRetry && !errorActions ? 'Dismiss' : undefined}
        onSecondary={onRetry && !errorActions ? dismiss : undefined}
        onClose={dismiss}
        extra={errorActions}
      />
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

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className='icon-btn' aria-label={label}>
      ←
    </Link>
  )
}
