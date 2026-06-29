import type { MilkEntry, MilkEntryInput } from './types'

const KEY = 'arkive_milk_v1'

function randomId(): string { return Math.random().toString(36).slice(2, 18) }

function loadAll(): MilkEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as MilkEntry[]) : []
  } catch { return [] }
}

function saveAll(entries: MilkEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function getMilkEntries(familyId: string): MilkEntry[] {
  return loadAll().filter(e => e.familyId === familyId)
}

export function getMilkForMonth(familyId: string, year: number, month: number): MilkEntry[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return getMilkEntries(familyId).filter(e => e.date.startsWith(prefix))
}

export function addMilkEntry(input: MilkEntryInput): MilkEntry {
  const entry: MilkEntry = { ...input, entryId: randomId(), createdAt: new Date().toISOString() }
  const all = loadAll()
  // Replace existing entry for same date if present
  const existing = all.findIndex(e => e.familyId === input.familyId && e.date === input.date)
  if (existing >= 0) { all[existing] = entry } else { all.push(entry) }
  saveAll(all)
  return entry
}

export function deleteMilkEntry(entryId: string): void {
  saveAll(loadAll().filter(e => e.entryId !== entryId))
}

export function monthlyMilkTotal(entries: MilkEntry[]): { litres: number; cost: number } {
  let litres = 0
  let cost = 0
  for (const e of entries) {
    litres += e.litres
    cost += e.litres * e.pricePerLitre
  }
  return { litres, cost }
}
