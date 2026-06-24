import { PLANS } from '../payments/plans'
import type { Plan } from '../payments/plans'

function PlanCard({ plan, current }: { plan: Plan; current: boolean }) {
  return (
    <div className={`plan-card${current ? ' plan-card-current' : ''}`}>
      <div className="plan-header">
        <h2 className="plan-name">{plan.name}</h2>
        {plan.priceInr === 0 ? (
          <p className="plan-price">Free</p>
        ) : (
          <p className="plan-price">
            INR {plan.priceInr}<span className="plan-period">/mo</span>
          </p>
        )}
      </div>
      <ul className="plan-features">
        <li>Up to {plan.maxMembers} member{plan.maxMembers !== 1 ? 's' : ''}</li>
        <li>{plan.storageLimitGb} GB storage</li>
        <li>OCR scanning: {plan.ocrEnabled ? 'Yes' : 'No'}</li>
        <li>Financial dashboard: {plan.financialDashboard ? 'Yes' : 'No'}</li>
      </ul>
      {!current && plan.priceInr > 0 && (
        <button className="btn-primary" type="button">Upgrade</button>
      )}
      {current && <p className="plan-badge">Current plan</p>}
    </div>
  )
}

export function SubscriptionScreen() {
  const currentPlanId = 'free'

  return (
    <main className="screen">
      <header className="screen-header">
        <h1>Subscription</h1>
      </header>
      <section className="screen-body">
        <div className="plan-list">
          {Object.values(PLANS).map(plan => (
            <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlanId} />
          ))}
        </div>
        <p className="text-muted" style={{ textAlign: 'center', marginTop: 16, fontSize: 12 }}>
          Payments via Razorpay. All data encrypted locally.
        </p>
      </section>
    </main>
  )
}
