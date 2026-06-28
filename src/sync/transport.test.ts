import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recordViewed, getRecentlyViewed, markPrefetched, isPrefetched } from './prefetch'
import { type SignalMessage } from './signalClient'

// ---------------------------------------------------------------------------
// localStorage stub (Node test environment)
// ---------------------------------------------------------------------------
const store: Record<string, string> = {}
/* eslint-disable @typescript-eslint/no-dynamic-delete */
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
} as Storage
/* eslint-enable @typescript-eslint/no-dynamic-delete */

// Mock @capacitor/network so tests run in Node
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: async () => ({ connectionType: 'wifi', connected: true }),
    addListener: () => Promise.resolve({ remove: async () => { /* no-op */ } }),
  },
}))

// Mock vaultStore and familyStore for prefetchOnWifi tests
vi.mock('../vault/vaultStore', () => ({
  listDocuments: () => [
    { docId: 'doc1', hash: 'hash1', title: 'Aadhaar', type: 'aadhaar' },
    { docId: 'doc2', hash: 'hash2', title: 'PAN', type: 'pan' },
  ],
}))

vi.mock('../family/familyStore', () => ({
  getFamily: () => ({ familyId: 'fam1', name: 'Test Family' }),
}))

beforeEach(() => {
  localStorage.clear()
})

// ---------------------------------------------------------------------------
// Recently-viewed tracking
// ---------------------------------------------------------------------------
describe('recordViewed / getRecentlyViewed', () => {
  it('starts with an empty list', () => {
    expect(getRecentlyViewed()).toHaveLength(0)
  })

  it('records a viewed doc id', () => {
    recordViewed('doc1')
    expect(getRecentlyViewed()).toContain('doc1')
  })

  it('moves re-viewed doc to front', () => {
    recordViewed('doc1')
    recordViewed('doc2')
    recordViewed('doc1')
    const list = getRecentlyViewed()
    expect(list[0]).toBe('doc1')
    expect(list).toHaveLength(2)
  })

  it('caps list at 20 entries', () => {
    for (let i = 0; i < 25; i++) recordViewed(`doc-${i}`)
    expect(getRecentlyViewed()).toHaveLength(20)
  })

  it('most-recent doc is always first', () => {
    recordViewed('first')
    recordViewed('second')
    expect(getRecentlyViewed()[0]).toBe('second')
  })
})

// ---------------------------------------------------------------------------
// Prefetch tracking
// ---------------------------------------------------------------------------
describe('markPrefetched / isPrefetched', () => {
  it('returns false for unknown hash', () => {
    expect(isPrefetched('unknown-hash')).toBe(false)
  })

  it('returns true after marking', () => {
    markPrefetched('abc123')
    expect(isPrefetched('abc123')).toBe(true)
  })

  it('does not double-add the same hash', () => {
    markPrefetched('abc123')
    markPrefetched('abc123')
    const raw = localStorage.getItem('arkive_prefetch_v1') ?? '[]'
    const set = JSON.parse(raw) as string[]
    expect(set.filter(h => h === 'abc123')).toHaveLength(1)
  })

  it('tracks multiple hashes independently', () => {
    markPrefetched('hash-a')
    markPrefetched('hash-b')
    expect(isPrefetched('hash-a')).toBe(true)
    expect(isPrefetched('hash-b')).toBe(true)
    expect(isPrefetched('hash-c')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// prefetchOnWifi (mocked fetch)
// ---------------------------------------------------------------------------
describe('prefetchOnWifi', () => {
  it('fetches blobs on WiFi and marks them prefetched', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })
    globalThis.fetch = mockFetch

    const { prefetchOnWifi } = await import('./prefetch')
    await prefetchOnWifi('https://relay.example.com', 'test-token')

    // Two docs in our mock vaultStore, both should have been fetched
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(isPrefetched('hash1')).toBe(true)
    expect(isPrefetched('hash2')).toBe(true)
  })

  it('skips already-prefetched blobs', async () => {
    markPrefetched('hash1')
    markPrefetched('hash2')

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })
    globalThis.fetch = mockFetch

    const { prefetchOnWifi } = await import('./prefetch')
    await prefetchOnWifi('https://relay.example.com', 'test-token')

    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Signal message shape validation
// ---------------------------------------------------------------------------
describe('SignalMessage type shape', () => {
  it('accepts a valid offer signal', () => {
    const sig: SignalMessage = {
      id: 'sig-1',
      sender_id: 'device-a',
      recipient_id: 'device-b',
      family_id: 'fam1',
      type: 'offer',
      payload: JSON.stringify({ type: 'offer', sdp: 'v=0\r\n' }),
      expires_at: Date.now() + 300_000,
    }
    expect(sig.type).toBe('offer')
    expect(sig.sender_id).toBe('device-a')
  })

  it('accepts an ice signal', () => {
    const sig: SignalMessage = {
      id: 'sig-2',
      sender_id: 'device-b',
      recipient_id: 'device-a',
      family_id: 'fam1',
      type: 'ice',
      payload: JSON.stringify({ candidate: 'candidate:...', sdpMid: '0', sdpMLineIndex: 0 }),
      expires_at: Date.now() + 300_000,
    }
    expect(sig.type).toBe('ice')
  })

  it('accepts a presence signal', () => {
    const sig: SignalMessage = {
      id: 'sig-3',
      sender_id: 'device-c',
      recipient_id: '__presence__device-c',
      family_id: 'fam1',
      type: 'presence',
      payload: JSON.stringify({ deviceId: 'device-c' }),
      expires_at: Date.now() + 300_000,
    }
    expect(sig.type).toBe('presence')
    expect(sig.recipient_id).toContain('__presence__')
  })
})

// ---------------------------------------------------------------------------
// postSignal / pollSignals / ackSignal (mocked fetch)
// ---------------------------------------------------------------------------
describe('signalClient', () => {
  it('postSignal sends POST to /signal and returns id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'sig-abc' }),
    })

    const { postSignal } = await import('./signalClient')
    const id = await postSignal('https://relay.example.com', 'tok', 'device-b', 'offer', '{}')
    expect(id).toBe('sig-abc')
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('https://relay.example.com/signal')
  })

  it('pollSignals sends GET to /signal and returns array', async () => {
    const fakeSignals: SignalMessage[] = [
      {
        id: 's1', sender_id: 'a', recipient_id: 'b', family_id: 'f1',
        type: 'answer', payload: '{}', expires_at: 0,
      },
    ]
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ signals: fakeSignals }),
    })

    const { pollSignals } = await import('./signalClient')
    const sigs = await pollSignals('https://relay.example.com', 'tok')
    expect(sigs).toHaveLength(1)
    expect(sigs[0].type).toBe('answer')
  })

  it('ackSignal sends DELETE to /signal/:id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    const { ackSignal } = await import('./signalClient')
    await ackSignal('https://relay.example.com', 'tok', 'sig-abc')
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0][0]).toBe('https://relay.example.com/signal/sig-abc')
    expect(calls[0][1]?.method).toBe('DELETE')
  })

  it('getOnlineDevices returns presence list', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        online: [
          { deviceId: 'device-a', payload: JSON.stringify({ deviceId: 'device-a' }) },
          { deviceId: 'device-b', payload: JSON.stringify({ deviceId: 'device-b' }) },
        ],
      }),
    })

    const { getOnlineDevices } = await import('./signalClient')
    const online = await getOnlineDevices('https://relay.example.com', 'tok')
    expect(online).toHaveLength(2)
    expect(online[0].deviceId).toBe('device-a')
  })

  it('getOnlineDevices returns [] on error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    const { getOnlineDevices } = await import('./signalClient')
    const online = await getOnlineDevices('https://relay.example.com', 'tok')
    expect(online).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// isOnWifi (mocked @capacitor/network)
// ---------------------------------------------------------------------------
describe('network detection', () => {
  it('isOnWifi returns true when Network reports wifi', async () => {
    const { isOnWifi } = await import('./network')
    const result = await isOnWifi()
    expect(result).toBe(true)
  })

  it('getConnectionType returns wifi from mock', async () => {
    const { getConnectionType } = await import('./network')
    const type = await getConnectionType()
    expect(type).toBe('wifi')
  })
})
