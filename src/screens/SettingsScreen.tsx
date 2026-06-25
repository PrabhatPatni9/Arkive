import { useState, useCallback } from 'react'
import { ChevronRight, Moon, Sun, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ACCENT_OPTIONS = [
  { key: 'blue',   hex: '#4f8ef7', label: 'Blue (default)' },
  { key: 'green',  hex: '#2D9B6F', label: 'Green' },
  { key: 'purple', hex: '#9747FF', label: 'Purple' },
  { key: 'teal',   hex: '#00A8B5', label: 'Teal' },
  { key: 'rose',   hex: '#E05FA5', label: 'Rose' },
  { key: 'indigo', hex: '#6366f1', label: 'Indigo' },
] as const

function getStored(key: string, fallback: string) {
  return typeof localStorage !== 'undefined' ? (localStorage.getItem(key) ?? fallback) : fallback
}

export function SettingsScreen() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => getStored('arkive_theme', 'light'))
  const [accent, setAccent] = useState(() => getStored('arkive_accent', 'blue'))

  const applyTheme = useCallback((t: string) => {
    setTheme(t)
    localStorage.setItem('arkive_theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const applyAccent = useCallback((a: string) => {
    setAccent(a)
    localStorage.setItem('arkive_accent', a)
    document.documentElement.setAttribute('data-accent', a)
  }, [])

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Settings</p>
          <p className="screen-subtitle">Appearance, security & more</p>
        </div>
      </header>

      <div className="screen-body">
        {/* Appearance */}
        <div className="settings-section" style={{ marginTop: 16 }}>
          <p className="settings-group-label">Appearance</p>

          {/* Theme toggle */}
          <div className="card card-p" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
              Theme
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm${theme === 'light' ? ' btn-primary' : ' btn-ghost'}`}
                type="button"
                style={{ flex: 1 }}
                onClick={() => applyTheme('light')}
              >
                <Sun size={15} style={{ marginRight: 6 }} aria-hidden />
                Light
              </button>
              <button
                className={`btn btn-sm${theme === 'dark' ? ' btn-primary' : ' btn-ghost'}`}
                type="button"
                style={{ flex: 1 }}
                onClick={() => applyTheme('dark')}
              >
                <Moon size={15} style={{ marginRight: 6 }} aria-hidden />
                Dark
              </button>
            </div>
          </div>

          {/* Accent color picker */}
          <div className="card card-p" style={{ marginBottom: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
              Accent Colour
            </p>
            <div className="accent-picker">
              {ACCENT_OPTIONS.map(({ key, hex, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`accent-swatch${accent === key ? ' selected' : ''}`}
                  style={{ background: hex }}
                  aria-label={label}
                  onClick={() => applyAccent(key)}
                />
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              {ACCENT_OPTIONS.find(o => o.key === accent)?.label ?? 'Blue'}
            </p>
          </div>
        </div>

        {/* Subscription */}
        <div className="settings-section">
          <p className="settings-group-label">Subscription</p>
          <button
            className="settings-row"
            type="button"
            onClick={() => navigate('/settings/subscription')}
          >
            <span className="settings-row-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={17} aria-hidden />
              Manage Plan
            </span>
            <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
          </button>
        </div>

        {/* Recovery */}
        <div className="settings-section">
          <p className="settings-group-label">Recovery</p>
          {['View Recovery Phrase', 'Trusted Contacts', 'Shamir Backup'].map((label) => (
            <button key={label} className="settings-row" type="button">
              <span className="settings-row-label">{label}</span>
              <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
            </button>
          ))}
        </div>

        {/* Security */}
        <div className="settings-section">
          <p className="settings-group-label">Security</p>
          {['Biometric Lock', 'Key Rotation', 'Manage Devices'].map((label) => (
            <button key={label} className="settings-row" type="button">
              <span className="settings-row-label">{label}</span>
              <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
            </button>
          ))}
        </div>

        {/* About */}
        <div className="settings-section">
          <p className="settings-group-label">About</p>
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="settings-row-label">Version</span>
            <span className="settings-row-value">0.0.1 (open beta)</span>
          </div>
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="settings-row-label">Encryption</span>
            <span className="settings-row-value">XChaCha20-Poly1305</span>
          </div>
        </div>
      </div>
    </main>
  )
}
