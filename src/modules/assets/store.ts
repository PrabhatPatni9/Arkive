import type { Asset, AssetInput } from './types'

// Same local-first, family-scoped store pattern as the other modules.
const KEY = 'arkive_assets_v1'

function randomId(): string {
  return Math.random().toString(36).slice(2, 18)
}

function loadAll(): Asset[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Asset[]) : []
  } catch {
    return []
  }
}

function saveAll(assets: Asset[]): void {
  localStorage.setItem(KEY, JSON.stringify(assets))
}

export function getAssets(familyId: string): Asset[] {
  return loadAll().filter(a => a.familyId === familyId)
}

export function getAsset(assetId: string): Asset | undefined {
  return loadAll().find(a => a.assetId === assetId)
}

export function addAsset(input: AssetInput): Asset {
  const now = new Date().toISOString()
  const asset: Asset = { ...input, assetId: randomId(), createdAt: now, updatedAt: now }
  const all = loadAll()
  all.push(asset)
  saveAll(all)
  return asset
}

export function updateAsset(assetId: string, updates: Partial<AssetInput>): void {
  const all = loadAll()
  const idx = all.findIndex(a => a.assetId === assetId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  saveAll(all)
}

export function deleteAsset(assetId: string): void {
  saveAll(loadAll().filter(a => a.assetId !== assetId))
}
