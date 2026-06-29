import type { FamilyState } from '../family/familyStore'

const RELAY_URL_BASE = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? ''

function enforceHttps(url: string): void {
  if (url && !url.startsWith('https://')) {
    throw new Error(`Relay URL must use HTTPS — got: ${url}`)
  }
}

export interface EntitlementResult {
  active: boolean
  tier: string
  validUntil: string
  familyId: string
}

export interface PendingJoinEntry {
  requestId: string
  requestJson: string
  postedAt: string
}

export async function registerWithRelay(
  relayUrl: string,
  family: FamilyState,
  pushSubscription?: PushSubscriptionJSON
): Promise<string> {
  enforceHttps(relayUrl)
  const body: Record<string, unknown> = {
    device_id: family.deviceId,
    family_id: family.familyId,
    sign_public_key: family.deviceSigKeypair.publicKey,
  }
  if (pushSubscription) {
    body.push_subscription = pushSubscription
  }
  const res = await fetch(`${relayUrl}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Device registration failed: ${res.status}`)
  const data = await res.json() as { ok: boolean; token: string }
  if (!data.token) throw new Error('Relay did not return a token')
  return data.token
}

export async function lookupEntitlement(
  relayUrl: string,
  token: string
): Promise<EntitlementResult> {
  enforceHttps(relayUrl)
  const res = await fetch(`${relayUrl}/entitlement`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Entitlement check failed: ${res.status}`)
  return res.json() as Promise<EntitlementResult>
}

export async function postJoinRequest(
  relayUrl: string,
  familyId: string,
  requestId: string,
  requestJson: string
): Promise<void> {
  enforceHttps(relayUrl)
  const res = await fetch(`${relayUrl}/join/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ family_id: familyId, request_id: requestId, request_json: requestJson }),
  })
  if (!res.ok) throw new Error(`Post join request failed: ${res.status}`)
}

export async function pollJoinApproval(
  relayUrl: string,
  requestId: string
): Promise<string | null> {
  enforceHttps(relayUrl)
  const res = await fetch(
    `${relayUrl}/join/approvals/${encodeURIComponent(requestId)}`
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Poll approval failed: ${res.status}`)
  const data = await res.json() as { approvalJson: string }
  return data.approvalJson
}

export async function getPendingJoinRequests(
  relayUrl: string,
  token: string
): Promise<PendingJoinEntry[]> {
  enforceHttps(relayUrl)
  const res = await fetch(`${relayUrl}/join/requests`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Fetch pending requests failed: ${res.status}`)
  const data = await res.json() as { requests: PendingJoinEntry[] }
  return data.requests
}

export async function postJoinApproval(
  relayUrl: string,
  token: string,
  requestId: string,
  approvalJson: string
): Promise<void> {
  enforceHttps(relayUrl)
  const res = await fetch(`${relayUrl}/join/approvals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ request_id: requestId, approval_json: approvalJson }),
  })
  if (!res.ok) throw new Error(`Post approval failed: ${res.status}`)
}

export async function deleteFamily(
  relayUrl: string,
  token: string
): Promise<void> {
  enforceHttps(relayUrl)
  const res = await fetch(`${relayUrl}/family`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Family purge failed: ${res.status}`)
  }
}

export async function logEvent(
  relayUrl: string,
  token: string,
  eventName: string,
  familyId: string
): Promise<void> {
  try {
    enforceHttps(relayUrl)
    await fetch(`${relayUrl}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ event: eventName, family_id: familyId }),
    })
  } catch { /* fire-and-forget; ignore errors */ }
}

void RELAY_URL_BASE
