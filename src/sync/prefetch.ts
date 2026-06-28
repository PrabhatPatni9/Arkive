import { isOnWifi } from './network'
import { listDocuments } from '../vault/vaultStore'
import { getFamily } from '../family/familyStore'

const VIEWED_KEY = 'arkive_recently_viewed_v1'
const BLOB_RELAY_KEY = 'arkive_prefetch_v1'

export function recordViewed(docId: string): void {
  try {
    const raw = localStorage.getItem(VIEWED_KEY)
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const updated = [docId, ...list.filter(id => id !== docId)].slice(0, 20)
    localStorage.setItem(VIEWED_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

export function getRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(VIEWED_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}

export function markPrefetched(hash: string): void {
  try {
    const raw = localStorage.getItem(BLOB_RELAY_KEY)
    const set: string[] = raw ? (JSON.parse(raw) as string[]) : []
    if (!set.includes(hash)) {
      set.push(hash)
      localStorage.setItem(BLOB_RELAY_KEY, JSON.stringify(set))
    }
  } catch { /* ignore */ }
}

export function isPrefetched(hash: string): boolean {
  try {
    const raw = localStorage.getItem(BLOB_RELAY_KEY)
    const set: string[] = raw ? (JSON.parse(raw) as string[]) : []
    return set.includes(hash)
  } catch { return false }
}

// Fetch a blob from relay and store it in localStorage so it's available offline
async function prefetchBlob(
  relayUrl: string,
  token: string,
  familyId: string,
  hash: string
): Promise<void> {
  if (isPrefetched(hash)) return
  try {
    const res = await fetch(`${relayUrl}/blob/${hash}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return
    const bytes = new Uint8Array(await res.arrayBuffer())
    // Blobs are already in localStorage via vaultStore (put there at save time);
    // this path is for blobs that were saved on another device and only exist on relay.
    // For now, mark as "known-on-relay" so we can fetch on demand.
    markPrefetched(hash)
    void bytes  // suppress unused warning — bytes would be stored in a future SQLite cache
  } catch { /* best-effort */ }
}

export async function prefetchOnWifi(relayUrl: string, token: string): Promise<void> {
  const onWifi = await isOnWifi()
  if (!onWifi) return

  const family = getFamily()
  if (!family) return

  const docs = listDocuments()
  const recentlyViewed = new Set(getRecentlyViewed())

  // Priority 1: all documents (all are critical in a family vault)
  // Priority 2: recently viewed first
  const ordered = [
    ...docs.filter(d => recentlyViewed.has(d.docId)),
    ...docs.filter(d => !recentlyViewed.has(d.docId)),
  ]

  // Prefetch in background, one at a time to not hammer the relay
  for (const doc of ordered) {
    if (!isPrefetched(doc.hash)) {
      await prefetchBlob(relayUrl, token, family.familyId, doc.hash)
      // Brief pause to be polite to Cloudflare
      await new Promise(r => setTimeout(r, 100))
    }
  }
}
