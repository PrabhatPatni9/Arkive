import type { HomeDevice, HomeDeviceInput } from './types'

const KEY = 'arkive_homedevices_v1'

function randomId(): string { return Math.random().toString(36).slice(2, 18) }

function loadAll(): HomeDevice[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as HomeDevice[]) : []
  } catch { return [] }
}

function saveAll(devices: HomeDevice[]): void {
  localStorage.setItem(KEY, JSON.stringify(devices))
}

export function getHomeDevices(familyId: string): HomeDevice[] {
  return loadAll().filter(d => d.familyId === familyId)
}

export function addHomeDevice(input: HomeDeviceInput): HomeDevice {
  const now = new Date().toISOString()
  const device: HomeDevice = { ...input, deviceId: randomId(), createdAt: now, updatedAt: now }
  const all = loadAll()
  all.push(device)
  saveAll(all)
  return device
}

export function updateHomeDevice(deviceId: string, updates: Partial<HomeDeviceInput>): void {
  const all = loadAll()
  const idx = all.findIndex(d => d.deviceId === deviceId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  saveAll(all)
}

export function deleteHomeDevice(deviceId: string): void {
  saveAll(loadAll().filter(d => d.deviceId !== deviceId))
}

export function isWarrantyExpiringSoon(device: HomeDevice, withinDays = 30): boolean {
  if (!device.warrantyExpiry) return false
  const expiry = new Date(device.warrantyExpiry)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  return diffMs >= 0 && diffMs <= withinDays * 86_400_000
}
