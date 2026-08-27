import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', icon: '◉', label: 'Today' },
  { to: '/practicing', icon: '☰', label: 'Practicing' },
  { to: '/all', icon: '⌗', label: 'All 100' },
];

/** Bottom tab bar shared by the three home views. */
export default function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Main">
      <div className="tab-bar-inner">
        {TABS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => (isActive ? 'tab tab-active' : 'tab')}
          >
            <span className="tab-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="tab-label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
