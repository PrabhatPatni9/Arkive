export interface SignalMessage {
  id: string
  sender_id: string
  recipient_id: string
  family_id: string
  type: 'offer' | 'answer' | 'ice' | 'presence'
  payload: string
  expires_at: number
}

export interface PresenceEntry {
  deviceId: string
  payload: string
}

export async function postSignal(
  relayUrl: string,
  token: string,
  recipientDeviceId: string,
  type: SignalMessage['type'],
  payload: string
): Promise<string> {
  const res = await fetch(`${relayUrl}/signal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ recipient_device_id: recipientDeviceId, type, payload }),
  })
  if (!res.ok) throw new Error(`Signal POST failed: ${res.status}`)
  const { id } = await res.json() as { id: string }
  return id
}

export async function pollSignals(
  relayUrl: string,
  token: string
): Promise<SignalMessage[]> {
  const res = await fetch(`${relayUrl}/signal`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Signal GET failed: ${res.status}`)
  const { signals } = await res.json() as { signals: SignalMessage[] }
  return signals
}

export async function ackSignal(
  relayUrl: string,
  token: string,
  id: string
): Promise<void> {
  await fetch(`${relayUrl}/signal/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
}

export async function postPresence(
  relayUrl: string,
  token: string,
  deviceId: string,
  payload: string
): Promise<void> {
  // Presence is just a signal addressed to a broadcast sentinel recipient
  await postSignal(relayUrl, token, `__presence__${deviceId}`, 'presence', payload)
}

export async function getOnlineDevices(
  relayUrl: string,
  token: string
): Promise<PresenceEntry[]> {
  const res = await fetch(`${relayUrl}/signal/presence`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return []
  const { online } = await res.json() as { online: PresenceEntry[] }
  return online
}
