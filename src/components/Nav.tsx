import { NavLink } from 'react-router-dom'
import { Home, Users, Shield, Heart, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/home',     label: 'Home',     Icon: Home },
  { to: '/family',   label: 'Family',   Icon: Users },
  { to: '/vault',    label: 'Vault',    Icon: Shield },
  { to: '/medical',  label: 'Medical',  Icon: Heart },
  { to: '/settings', label: 'Settings', Icon: Settings },
] as const

export function Nav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.25 : 2} aria-hidden />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
