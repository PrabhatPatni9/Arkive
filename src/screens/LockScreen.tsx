import { useState } from 'react'
import { Lock } from 'lucide-react'
import { verifyPin } from '../security/appLock'

/**
 * Full-screen PIN gate shown before the app when the app lock is enabled and the app is locked.
 * Renders in place of the routed app, so no vault content is reachable until the PIN is entered.
 */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin || checking) return
    setChecking(true)
    setError('')
    const ok = await verifyPin(pin)
    setChecking(false)
    if (ok) {
      onUnlock()
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  return (
    <main
      className="screen"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: 24 }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Lock size={26} color="var(--accent)" />
      </div>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Arkive is locked</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Enter your PIN to continue</p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 280 }}>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="PIN"
          style={{
            width: '100%', textAlign: 'center', letterSpacing: 8, fontSize: 20,
            padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)',
            background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={checking}>
          {checking ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </main>
  )
}
