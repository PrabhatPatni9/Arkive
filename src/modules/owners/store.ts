import type { Entity, EntityInput } from './types'

// Follows the same local-first store pattern as the other modules (insurance, vehicles, …):
// family-scoped records keyed by a stable arkive_*_v1 localStorage key.
const KEY = 'arkive_entities_v1'

function randomId(): string {
  return Math.random().toString(36).slice(2, 18)
}

function loadAll(): Entity[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Entity[]) : []
  } catch {
    return []
  }
}

function saveAll(entities: Entity[]): void {
  localStorage.setItem(KEY, JSON.stringify(entities))
}

export function getEntities(familyId: string): Entity[] {
  return loadAll().filter(e => e.familyId === familyId)
}

export function getEntity(entityId: string): Entity | undefined {
  return loadAll().find(e => e.entityId === entityId)
}

export function addEntity(input: EntityInput): Entity {
  const now = new Date().toISOString()
  const entity: Entity = { ...input, entityId: randomId(), createdAt: now, updatedAt: now }
  const all = loadAll()
  all.push(entity)
  saveAll(all)
  return entity
}

export function updateEntity(entityId: string, updates: Partial<EntityInput>): void {
  const all = loadAll()
  const idx = all.findIndex(e => e.entityId === entityId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  saveAll(all)
}

export function deleteEntity(entityId: string): void {
  saveAll(loadAll().filter(e => e.entityId !== entityId))
}
