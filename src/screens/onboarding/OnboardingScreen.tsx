import { useNavigate } from 'react-router-dom'
import { Shield, UserPlus, Users } from 'lucide-react'

export function OnboardingScreen() {
  const navigate = useNavigate()

  return (
    <main className="screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 0 }}>
        {/* Logo / brand */}
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Shield size={36} color="white" />
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 8 }}>
          Arkive
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, maxWidth: 300, marginBottom: 48 }}>
          Your family vault, end-to-end encrypted. Operator never sees your data — only your family holds the keys.
        </p>

        {/* Actions */}
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-primary"
            type="button"
            style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}
            onClick={() => navigate('/onboarding/create')}
          >
            <Users size={19} />
            Create a Family Vault
          </button>

          <button
            className="btn btn-outline"
            type="button"
            style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}
            onClick={() => navigate('/onboarding/join')}
          >
            <UserPlus size={19} />
            Join an Existing Family
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)' }}>
        Keys are generated on your device and never leave it without your consent.
      </p>
    </main>
  )
}
