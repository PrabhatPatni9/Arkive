import { describe, it, expect, beforeEach } from 'vitest'
import { getAssets, getAsset, addAsset, updateAsset, deleteAsset } from './store'
import type { Owner } from '../owners/types'

const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { Reflect.deleteProperty(store, k) },
  clear: () => { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) },
  key: (i: number) => Object.keys(store)[i] ?? null,
  length: 0,
}

beforeEach(() => {
  Object.keys(store).forEach(k => Reflect.deleteProperty(store, k))
})

const FAM = 'fam-1'
const OWNER: Owner = { kind: 'person', memberId: 'm-1' }

function makeAsset(overrides = {}) {
  return addAsset({
    familyId: FAM,
    assetType: 'vehicle',
    name: 'Family car',
    owner: OWNER,
    ...overrides,
  })
}

describe('asset CRUD', () => {
  it('adds and retrieves an asset', () => {
    const a = makeAsset()
    expect(getAssets(FAM)).toHaveLength(1)
    expect(getAsset(a.assetId)?.name).toBe('Family car')
  })

  it('scopes assets by familyId', () => {
    makeAsset()
    makeAsset({ familyId: 'other' })
    expect(getAssets(FAM)).toHaveLength(1)
  })

  it('updates an asset', () => {
    const a = makeAsset()
    updateAsset(a.assetId, { value: 500000, location: 'Pune' })
    expect(getAsset(a.assetId)?.value).toBe(500000)
    expect(getAsset(a.assetId)?.location).toBe('Pune')
  })

  it('deletes an asset', () => {
    const a = makeAsset()
    deleteAsset(a.assetId)
    expect(getAssets(FAM)).toHaveLength(0)
  })

  it('stores an entity owner', () => {
    const a = makeAsset({ owner: { kind: 'entity', entityId: 'e-1' } })
    expect(getAsset(a.assetId)?.owner).toEqual({ kind: 'entity', entityId: 'e-1' })
  })
})
