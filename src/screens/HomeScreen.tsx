import { FileText, Heart, Shield, AlertTriangle, Bell, ChevronRight, Calendar, ShieldCheck, Car, Wallet, Droplets, BookOpen, Cpu, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFamily } from '../family/familyStore'
import { getReminders, isOverdue, isDueSoon } from '../reminders/engine'
import { isModuleEnabled } from '../modules/store'

function greetingForHour(h: number) {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const CORE_CARDS = [
  { icon: FileText,    title: 'Documents', desc: 'Aadhaar, passport, wills', to: '/vault' },
  { icon: Heart,       title: 'Medical',   desc: 'Medicines, vitals, doctors', to: '/medical' },
  { icon: Calendar,    title: 'Calendar',  desc: 'Birthdays & appointments', to: '/calendar' },
]

const MODULE_CARDS = [
  { id: 'insurance'    as const, icon: ShieldCheck, title: 'Insurance',     desc: 'Policies & renewals',      to: '/insurance' },
  { id: 'vehicles'     as const, icon: Car,          title: 'Vehicles',      desc: 'PUC, insurance, fuel',     to: '/vehicles' },
  { id: 'expenses'     as const, icon: Wallet,       title: 'Expenses',      desc: 'Petrol, milk, bills',      to: '/expenses' },
  { id: 'milk'         as const, icon: Droplets,     title: 'Milk Tracker',  desc: 'Daily log & cost',         to: '/milk' },
  { id: 'contacts'     as const, icon: BookOpen,     title: 'Contacts',      desc: 'Doctors, services',        to: '/contacts' },
  { id: 'home_devices' as const, icon: Cpu,          title: 'Home Devices',  desc: 'Appliances & warranties',  to: '/home-devices' },
  { id: 'identity'     as const, icon: User,         title: 'Identity',      desc: 'Your ID documents',        to: '/identity' },
]

export function HomeScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const greeting = greetingForHour(new Date().getHours())
  const family = getFamily()
  const myName = family?.members.find(m => m.memberId === family.myMemberId)?.name ?? 'there'

  const reminders = family ? getReminders(family.familyId) : []
  const overdueCount = reminders.filter(r => isOverdue(r)).length
  const soonCount = reminders.filter(r => !isOverdue(r) && isDueSoon(r, r.advanceNoticeDays)).length

  const activeModules = MODULE_CARDS.filter(m => isModuleEnabled(m.id))

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20, marginBottom: 0 }}>
        <div>
          <p className="screen-title">{greeting}, {myName.split(' ')[0]}</p>
          <p className="screen-subtitle">{family?.familyName ?? 'Your family vault'}</p>
        </div>
        <div
          className="avatar"
          style={{ width: 44, height: 44, fontSize: 18, cursor: 'default' }}
          aria-label="Profile"
        >
          {myName.charAt(0).toUpperCase()}
        </div>
      </header>

      <div className="screen-body">
        {/* Security badge */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <span className="section-badge">
            <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />
            {t('home.e2e_encrypted')}
          </span>
        </div>

        <p className="text-muted" style={{ marginBottom: 20, fontSize: 13 }}>
          {t('home.privacy_note')}
        </p>

        {/* Emergency banner */}
        <button
          type="button"
          onClick={() => navigate('/emergency')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', background: 'rgba(229,62,62,0.08)',
            border: '1.5px solid rgba(229,62,62,0.3)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(229,62,62,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={20} color="var(--danger)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>{t('home.emergency_access')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {t('home.emergency_desc')}
            </p>
          </div>
          <ChevronRight size={18} color="var(--danger)" />
        </button>

        {/* Core quick access */}
        <p className="section-header" style={{ marginTop: 0 }}>{t('home.quick_access')}</p>
        <div className="card-grid">
          {CORE_CARDS.map(({ icon: Icon, title, desc, to }) => (
            <button
              key={title}
              className="feature-card"
              onClick={() => navigate(to)}
              type="button"
              style={{ textAlign: 'left', border: 'none' }}
            >
              <div className="feature-icon"><Icon size={18} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </button>
          ))}
        </div>

        {/* Feature-flagged modules */}
        {activeModules.length > 0 && (
          <>
            <p className="section-header" style={{ marginTop: 24 }}>{t('home.modules')}</p>
            <div className="card-grid">
              {activeModules.map(({ icon: Icon, title, desc, to }) => (
                <button
                  key={to}
                  className="feature-card"
                  onClick={() => navigate(to)}
                  type="button"
                  style={{ textAlign: 'left', border: 'none' }}
                >
                  <div className="feature-icon"><Icon size={18} /></div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Reminders */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
          <p className="section-header" style={{ margin: 0 }}>{t('home.coming_up')}</p>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
            onClick={() => navigate('/reminders')}
          >
            {t('common.see_all')}
          </button>
        </div>

        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/reminders')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              background: 'rgba(229,62,62,0.08)', border: '1.5px solid rgba(229,62,62,0.3)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
            }}
          >
            <Bell size={18} color="var(--danger)" />
            <p style={{ fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>
              {overdueCount} overdue reminder{overdueCount !== 1 ? 's' : ''}
            </p>
            <ChevronRight size={16} color="var(--danger)" style={{ marginLeft: 'auto' }} />
          </button>
        )}

        {soonCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/reminders')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Bell size={18} color="var(--warning)" />
            <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
              {soonCount} reminder{soonCount !== 1 ? 's' : ''} coming up
            </p>
            <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
          </button>
        )}

        {reminders.length === 0 && (
          <div className="card-row">
            <div className="empty-row">
              {t('home.no_reminders_hint')}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
