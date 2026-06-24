import { sodium } from '../crypto/sodium'
import type { PlanId } from './plans'
import { PLANS } from './plans'
import type { ScopeKey } from '../crypto/keys'
import type { OpWithHash } from '../crypto/ops'
import { createOp } from '../crypto/ops'
import { sealEnvelope } from '../crypto/envelope'

export interface SubscriptionState {
  planId: PlanId
  validUntil: string   // ISO-8601
  paymentId: string
  activatedAt: string  // ISO-8601
}

export function isSubscriptionActive(state: SubscriptionState): boolean {
  return new Date(state.validUntil) > new Date()
}

export function canAddMember(
  state: SubscriptionState,
  currentMemberCount: number
): boolean {
  return currentMemberCount < PLANS[state.planId].maxMembers
}

export function isOcrAllowed(state: SubscriptionState): boolean {
  if (!isSubscriptionActive(state)) return PLANS['free'].ocrEnabled
  return PLANS[state.planId].ocrEnabled
}

export function isFinancialDashboardAllowed(state: SubscriptionState): boolean {
  if (!isSubscriptionActive(state)) return false
  return PLANS[state.planId].financialDashboard
}

export function createSubscriptionOp(
  subscription: SubscriptionState,
  scopeKey: ScopeKey,
  authorDeviceId: string,
  signingSecretKey: Uint8Array,
  prevHash: string,
  lamportClock: number
): OpWithHash {
  const payload = sodium.from_string(
    JSON.stringify({ type: 'subscription', ...subscription })
  )
  return createOp(
    {
      scope: scopeKey.scope,
      keyEpoch: scopeKey.epoch,
      prevHash,
      lamportClock,
      authorDeviceId,
      signingSecretKey,
      plaintextPayload: payload,
      scopeKeyBytes: scopeKey.bytes,
    },
    sealEnvelope
  )
}
