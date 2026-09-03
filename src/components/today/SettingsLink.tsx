import { Link } from 'react-router-dom'

/** The sliders icon in the Today header. */
export default function SettingsLink() {
  return (
    <Link to='/settings' className='icon-btn' aria-label='Settings'>
      <svg width='16' height='16' viewBox='0 0 16 16' aria-hidden='true'>
        <line x1='2.2' y1='4.6' x2='13.8' y2='4.6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
        <line x1='2.2' y1='11.4' x2='13.8' y2='11.4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
        <circle cx='10.4' cy='4.6' r='2.5' fill='var(--card)' stroke='currentColor' strokeWidth='1.5' />
        <circle cx='5.6' cy='11.4' r='2.5' fill='var(--card)' stroke='currentColor' strokeWidth='1.5' />
      </svg>
    </Link>
  )
}
