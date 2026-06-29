import type { Vehicle, VehicleInput } from './types'

const KEY = 'arkive_vehicles_v1'

function randomId(): string { return Math.random().toString(36).slice(2, 18) }

function loadAll(): Vehicle[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Vehicle[]) : []
  } catch { return [] }
}

function saveAll(vehicles: Vehicle[]): void {
  localStorage.setItem(KEY, JSON.stringify(vehicles))
}

export function getVehicles(familyId: string): Vehicle[] {
  return loadAll().filter(v => v.familyId === familyId)
}

export function addVehicle(input: VehicleInput): Vehicle {
  const now = new Date().toISOString()
  const vehicle: Vehicle = { ...input, vehicleId: randomId(), createdAt: now, updatedAt: now }
  const all = loadAll()
  all.push(vehicle)
  saveAll(all)
  return vehicle
}

export function updateVehicle(vehicleId: string, updates: Partial<VehicleInput>): void {
  const all = loadAll()
  const idx = all.findIndex(v => v.vehicleId === vehicleId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  saveAll(all)
}

export function deleteVehicle(vehicleId: string): void {
  saveAll(loadAll().filter(v => v.vehicleId !== vehicleId))
}

export function isVehicleDocExpiringSoon(date: string | undefined, withinDays = 30): boolean {
  if (!date) return false
  const expiry = new Date(date)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  return diffMs >= 0 && diffMs <= withinDays * 86_400_000
}
