import { describe, it, expect, beforeEach } from 'vitest'
import { getEntities, getEntity, addEntity, updateEntity, deleteEntity } from './store'
import { defaultTierForEntityType } from './types'

// Stub localStorage (same pattern as the other module tests)
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

function makeEntity(overrides = {}) {
  return addEntity({
    familyId: FAM,
    entityType: 'HUF',
    name: 'Patni HUF',
    linkedMemberIds: [],
    defaultTier: 'node',
    ...overrides,
  })
}

describe('entity CRUD', () => {
  it('adds and retrieves an entity', () => {
    const e = makeEntity()
    const list = getEntities(FAM)
    expect(list).toHaveLength(1)
    expect(list[0].entityId).toBe(e.entityId)
    expect(getEntity(e.entityId)?.name).toBe('Patni HUF')
  })

  it('scopes entities by familyId', () => {
    makeEntity()
    makeEntity({ familyId: 'other-fam' })
    expect(getEntities(FAM)).toHaveLength(1)
  })

  it('updates an entity', () => {
    const e = makeEntity()
    updateEntity(e.entityId, { name: 'Renamed HUF', gstin: '22AAAAA0000A1Z5' })
    const updated = getEntity(e.entityId)
    expect(updated?.name).toBe('Renamed HUF')
    expect(updated?.gstin).toBe('22AAAAA0000A1Z5')
  })

  it('deletes an entity', () => {
    const e = makeEntity()
    deleteEntity(e.entityId)
    expect(getEntities(FAM)).toHaveLength(0)
  })
})

describe('defaultTierForEntityType', () => {
  it('maps HUF to node', () => {
    expect(defaultTierForEntityType('HUF')).toBe('node')
  })
  it('maps company/partnership/trust to family', () => {
    expect(defaultTierForEntityType('private_limited')).toBe('family')
    expect(defaultTierForEntityType('partnership')).toBe('family')
    expect(defaultTierForEntityType('trust')).toBe('family')
  })
  it('maps individual/proprietorship/other to self', () => {
    expect(defaultTierForEntityType('individual')).toBe('self')
    expect(defaultTierForEntityType('proprietorship')).toBe('self')
    expect(defaultTierForEntityType('other')).toBe('self')
  })
})
