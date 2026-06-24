import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/home',     label: 'Home',     icon: 'H' },
  { to: '/family',   label: 'Family',   icon: 'F' },
  { to: '/vault',    label: 'Vault',    icon: 'V' },
  { to: '/settings', label: 'Settings', icon: 'S' },
] as const

export function Nav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          aria-label={label}
        >
          <span className="nav-icon" aria-hidden="true">{icon}</span>
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
