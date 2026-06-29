import { useState, useCallback } from 'react'
import { ChevronRight, Moon, Sun, CreditCard, Shield, Download, Globe, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLocale, saveLocale, needsReview } from '../i18n/config'
import { MODULE_REGISTRY } from '../modules/types'
import { isModuleEnabled, setModuleEnabled, getAllModuleStates } from '../modules/store'
import type { ModuleId } from '../modules/types'

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
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useState(() => getStored('arkive_theme', 'light'))
  const [accent, setAccent] = useState(() => getStored('arkive_accent', 'blue'))
  const [showLangPicker, setShowLangPicker] = useState(false)
  const currentLocale = i18n.language as SupportedLocale
  const [moduleStates, setModuleStates] = useState(() => getAllModuleStates())

  const applyLanguage = useCallback((locale: SupportedLocale) => {
    void i18n.changeLanguage(locale)
    saveLocale(locale)
    setShowLangPicker(false)
  }, [i18n])

  const applyTheme = useCallback((t: string) => {
    setTheme(t)
    localStorage.setItem('arkive_theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const toggleModule = useCallback((id: ModuleId) => {
    const next = !isModuleEnabled(id)
    setModuleEnabled(id, next)
    setModuleStates(getAllModuleStates())
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
          <p className="screen-title">{t('settings.title')}</p>
          <p className="screen-subtitle">{t('settings.subtitle')}</p>
        </div>
      </header>

      <div className="screen-body">
        {/* Appearance */}
        <div className="settings-section" style={{ marginTop: 16 }}>
          <p className="settings-group-label">{t('settings.appearance')}</p>

          {/* Theme toggle */}
          <div className="card card-p" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
              {t('settings.theme')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm${theme === 'light' ? ' btn-primary' : ' btn-ghost'}`}
                type="button"
                style={{ flex: 1 }}
                onClick={() => applyTheme('light')}
              >
                <Sun size={15} style={{ marginRight: 6 }} aria-hidden />
                {t('settings.theme_light')}
              </button>
              <button
                className={`btn btn-sm${theme === 'dark' ? ' btn-primary' : ' btn-ghost'}`}
                type="button"
                style={{ flex: 1 }}
                onClick={() => applyTheme('dark')}
              >
                <Moon size={15} style={{ marginRight: 6 }} aria-hidden />
                {t('settings.theme_dark')}
              </button>
            </div>
          </div>

          {/* Language picker */}
          <div className="card card-p" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showLangPicker ? 12 : 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={15} aria-hidden />
                {t('settings.language')}
              </p>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                onClick={() => setShowLangPicker(p => !p)}
              >
                {SUPPORTED_LANGUAGES[currentLocale]}
              </button>
            </div>
            {showLangPicker && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(Object.entries(SUPPORTED_LANGUAGES) as [SupportedLocale, string][]).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => applyLanguage(code)}
                    style={{
                      background: code === currentLocale ? 'var(--accent-bg)' : 'none',
                      border: 'none', borderRadius: 8, padding: '8px 10px',
                      textAlign: 'left', cursor: 'pointer', fontSize: 14,
                      color: code === currentLocale ? 'var(--accent)' : 'var(--text)',
                      fontWeight: code === currentLocale ? 600 : 400,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    {label}
                    {needsReview(code) && (
                      <AlertTriangle size={13} color="var(--warning)" aria-label="Needs review" />
                    )}
                  </button>
                ))}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, padding: '0 4px' }}>
                  <AlertTriangle size={10} style={{ display: 'inline', marginRight: 4 }} />
                  {t('settings.language_review_warning')}
                </p>
              </div>
            )}
          </div>

          {/* Accent color picker */}
          <div className="card card-p" style={{ marginBottom: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
              {t('settings.accent_colour')}
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

        {/* Modules */}
        <div className="settings-section">
          <p className="settings-group-label">{t('settings.modules')}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 0 8px 0' }}>
            {t('settings.modules_subtitle')}
          </p>
          {MODULE_REGISTRY.map(m => (
            <div key={m.id} className="settings-row" style={{ cursor: 'pointer' }} onClick={() => toggleModule(m.id)}>
              <span className="settings-row-label">{t(m.labelKey)}</span>
              {moduleStates[m.id]
                ? <ToggleRight size={22} color="var(--accent)" aria-label="Enabled" />
                : <ToggleLeft size={22} color="var(--text-muted)" aria-label="Disabled" />
              }
            </div>
          ))}
        </div>

        {/* Subscription */}
        <div className="settings-section">
          <p className="settings-group-label">{t('settings.subscription')}</p>
          <button
            className="settings-row"
            type="button"
            onClick={() => navigate('/settings/subscription')}
          >
            <span className="settings-row-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={17} aria-hidden />
              {t('settings.manage_plan')}
            </span>
            <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
          </button>
        </div>

        {/* Recovery */}
        <div className="settings-section">
          <p className="settings-group-label">{t('settings.recovery')}</p>
          {([
            ['view_recovery', t('settings.view_recovery')],
            ['trusted_contacts', t('settings.trusted_contacts')],
            ['shamir_backup', t('settings.shamir_backup')],
          ] as const).map(([key, label]) => (
            <button key={key} className="settings-row" type="button">
              <span className="settings-row-label">{label}</span>
              <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
            </button>
          ))}
        </div>

        {/* Security */}
        <div className="settings-section">
          <p className="settings-group-label">{t('settings.security')}</p>
          {([
            ['biometric_lock', t('settings.biometric_lock')],
            ['key_rotation', t('settings.key_rotation')],
            ['manage_devices', t('settings.manage_devices')],
          ] as const).map(([key, label]) => (
            <button key={key} className="settings-row" type="button">
              <span className="settings-row-label">{label}</span>
              <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
            </button>
          ))}
        </div>

        {/* Data & Privacy */}
        <div className="settings-section">
          <p className="settings-group-label">{t('settings.data_privacy')}</p>
          <button
            className="settings-row"
            type="button"
            onClick={() => navigate('/settings/data')}
          >
            <span className="settings-row-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={17} aria-hidden />
              {t('settings.export_delete')}
            </span>
            <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
          </button>
          <button
            className="settings-row"
            type="button"
            onClick={() => navigate('/settings/data')}
          >
            <span className="settings-row-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={17} aria-hidden />
              {t('settings.leave_family')}
            </span>
            <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
          </button>
        </div>

        {/* About */}
        <div className="settings-section">
          <p className="settings-group-label">{t('settings.about')}</p>
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="settings-row-label">{t('settings.version')}</span>
            <span className="settings-row-value">0.0.1 (open beta)</span>
          </div>
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="settings-row-label">{t('settings.encryption')}</span>
            <span className="settings-row-value">XChaCha20-Poly1305</span>
          </div>
        </div>
      </div>
    </main>
  )
}
