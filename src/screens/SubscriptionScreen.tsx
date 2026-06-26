import { ExternalLink, Check, Wifi, Globe, Server } from 'lucide-react'
import { SYNC_TIERS } from '../payments/plans'
import type { SyncTier } from '../payments/plans'
import { loadEntitlement, getEffectiveSyncTier } from '../payments/subscription'

const TIER_ICONS: Record<string, React.ReactNode> = {
  local_lan:      <Wifi size={20} />,
  managed_relay:  <Globe size={20} />,
  self_hosted:    <Server size={20} />,
}

function TierCard({ tier, active }: { tier: SyncTier; active: boolean }) {
  const isFree = tier.priceInrPerYear === 0

  return (
    <div className={`plan-card${active ? ' plan-card-current' : ''}`}>
      <div className="plan-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="feature-icon" style={{ width: 36, height: 36, marginBottom: 0 }}>
            {TIER_ICONS[tier.id]}
          </div>
          <div>
            <h2 className="plan-name" style={{ fontSize: 16 }}>{tier.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{tier.tagline}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isFree ? (
            <p className="plan-price" style={{ fontSize: 16 }}>Free</p>
          ) : (
            <p className="plan-price" style={{ fontSize: 16 }}>
              ₹{tier.priceInrPerYear}<span className="plan-period">/yr</span>
            </p>
          )}
        </div>
      </div>

      <ul className="plan-features">
        {tier.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Check size={14} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
            {f}
          </li>
        ))}
      </ul>

      {active && (
        <p className="plan-badge">
          <Check size={13} style={{ display: 'inline', marginRight: 4 }} />
          Active
        </p>
      )}

      {!active && tier.id === 'managed_relay' && (
        <a
          href="https://arkive.punyakosh.in/billing"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ textDecoration: 'none', display: 'flex', gap: 6 }}
        >
          Subscribe on the web
          <ExternalLink size={15} />
        </a>
      )}

      {!active && tier.id === 'self_hosted' && (
        <a
          href="https://github.com/prabhatpatni9/arkive"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
          style={{ textDecoration: 'none', display: 'flex', gap: 6 }}
        >
          Deploy your own relay
          <ExternalLink size={15} />
        </a>
      )}
    </div>
  )
}

export function SubscriptionScreen() {
  const ent = loadEntitlement()
  const activeTierId = getEffectiveSyncTier(ent)

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Sync</p>
          <p className="screen-subtitle">All features free — pay only for managed relay</p>
        </div>
      </header>

      <div className="screen-body">
        <div className="card card-p" style={{ background: 'var(--accent-bg)', marginBottom: 16, marginTop: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--accent)', lineHeight: 1.5, fontWeight: 500 }}>
            OCR, unlimited members, and all document types are free on every plan.
            The only paid option is the managed relay — it syncs over the internet
            when devices are on different networks.
          </p>
        </div>

        {Object.values(SYNC_TIERS).map(tier => (
          <TierCard key={tier.id} tier={tier} active={tier.id === activeTierId} />
        ))}

        <p className="text-muted" style={{ textAlign: 'center', marginTop: 4, fontSize: 12 }}>
          Billing is web-only — per App Store rules, subscriptions are not sold in-app.
          All data is encrypted before it reaches any relay.
        </p>
      </div>
    </main>
  )
}
