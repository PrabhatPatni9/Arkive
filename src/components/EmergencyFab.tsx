import { useLocation, useNavigate } from 'react-router-dom'
import { Siren } from 'lucide-react'

/**
 * Always-visible Emergency shortcut. In a real emergency nobody should have to hunt through
 * menus, so this floating button sits above the bottom nav on every in-app screen and jumps
 * straight to the emergency view (blood group, allergies, medications, emergency contacts).
 * Hidden while already on an emergency screen to avoid redundancy.
 */
export function EmergencyFab() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (pathname.startsWith('/emergency')) return null

  return (
    <button
      type="button"
      className="emergency-fab"
      onClick={() => navigate('/emergency')}
      aria-label="Open emergency information"
    >
      <Siren size={18} aria-hidden />
      <span>Emergency</span>
    </button>
  )
}
