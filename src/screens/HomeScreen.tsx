import { FileText, Heart, Shield, Car, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function greetingForHour(h: number) {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const FEATURE_CARDS = [
  { icon: FileText,  title: 'Documents',  desc: 'Aadhaar, passport, wills',  to: '/vault' },
  { icon: Heart,     title: 'Medical',    desc: 'Health records & reports',   to: '/vault' },
  { icon: Car,       title: 'Vehicles',   desc: 'RC, insurance & PUC',        to: '/vault' },
  { icon: Lock,      title: 'Legal',      desc: 'Contracts & IDs',            to: '/vault' },
]

export function HomeScreen() {
  const navigate = useNavigate()
  const greeting = greetingForHour(new Date().getHours())

  return (
    <main className="screen">
      {/* Header */}
      <header className="screen-header" style={{ paddingTop: 20, marginBottom: 0 }}>
        <div>
          <p className="screen-title">{greeting} 👋</p>
          <p className="screen-subtitle">Your family vault, encrypted</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            className="avatar"
            style={{ width: 44, height: 44, fontSize: 18 }}
            aria-label="Profile"
          >
            A
          </div>
        </div>
      </header>

      <div className="screen-body">
        {/* Security badge */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <span className="section-badge">
            <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />
            End-to-end encrypted
          </span>
        </div>

        <p className="text-muted" style={{ marginBottom: 20, fontSize: 13 }}>
          Operator never sees your data. All keys live on your device.
        </p>

        {/* Quick access */}
        <p className="section-header" style={{ marginTop: 0 }}>Quick Access</p>
        <div className="card-grid">
          {FEATURE_CARDS.map(({ icon: Icon, title, desc, to }) => (
            <button
              key={title}
              className="feature-card"
              onClick={() => navigate(to)}
              type="button"
              style={{ textAlign: 'left', border: 'none' }}
            >
              <div className="feature-icon">
                <Icon size={18} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </button>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <p className="section-header">Family Activity</p>
        <div className="card-row">
          <div className="empty-row">
            No recent activity — start by adding your first document
          </div>
        </div>

        {/* Upcoming section */}
        <p className="section-header">Coming Up</p>
        <div className="card-row">
          <div className="empty-row">No upcoming reminders</div>
        </div>
      </div>
    </main>
  )
}
