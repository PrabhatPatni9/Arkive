import { UserPlus } from 'lucide-react'

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const PLACEHOLDER_MEMBERS = [
  { name: 'You (Admin)', role: 'Full access · Admin' },
]

export function FamilyScreen() {
  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Family</p>
          <p className="screen-subtitle">Members and devices</p>
        </div>
        <button className="icon-btn" aria-label="Invite member" type="button">
          <UserPlus size={20} />
        </button>
      </header>

      <div className="screen-body">
        <p className="section-header" style={{ marginTop: 16 }}>Members</p>
        <div className="card-row">
          {PLACEHOLDER_MEMBERS.map((m) => (
            <div className="member-card" key={m.name}>
              <Avatar name={m.name} />
              <div>
                <p className="member-name">{m.name}</p>
                <p className="member-role">{m.role}</p>
              </div>
            </div>
          ))}
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'transparent',
              border: '1.5px dashed var(--border)',
              borderRadius: 'var(--r-card)',
              padding: '14px 16px',
              minHeight: 64,
              color: 'var(--text-muted)',
              fontSize: 14,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <UserPlus size={20} aria-hidden />
            Invite a family member
          </button>
        </div>

        <p className="section-header">Devices</p>
        <div className="empty-row">No other devices linked yet</div>

        <p className="section-header">Key Recovery</p>
        <div className="card card-p" style={{ marginTop: 0 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Your family key is split with Shamir's Secret Sharing. Share shards with
            trusted members so the vault can be recovered if a device is lost.
          </p>
          <button className="btn btn-outline" style={{ marginTop: 12 }} type="button">
            Generate Recovery Shards
          </button>
        </div>
      </div>
    </main>
  )
}
