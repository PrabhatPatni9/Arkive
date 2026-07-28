import type { HomeDevice, HomeDeviceInput } from './types'
import { loadArray } from '../secureModuleStore'
import { persistSynced } from '../../sync/syncContext'

const KEY = 'arkive_homedevices_v1'

function randomId(): string { return Math.random().toString(36).slice(2, 18) }

function loadAll(): HomeDevice[] {
  return loadArray<HomeDevice>(KEY)
}

function saveAll(devices: HomeDevice[]): void {
  persistSynced(KEY, devices, 'deviceId')
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
