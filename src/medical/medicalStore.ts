import type { Medicine, Vital, Doctor, MedicineFrequency, VitalType } from './types'
import { loadArray } from '../modules/secureModuleStore'
import { persistSynced } from '../sync/syncContext'

const MEDS_KEY = 'arkive_medicines_v1'
const VITALS_KEY = 'arkive_vitals_v1'
const DOCTORS_KEY = 'arkive_doctors_v1'

function randomId(): string {
  return crypto.randomUUID()
}

// --- Medicines ---

export function listMedicines(): Medicine[] {
  try {
    return loadArray<Medicine>(MEDS_KEY)
  } catch { return [] }
}

function saveMedicines(meds: Medicine[]): void {
  persistSynced(MEDS_KEY, meds, 'medId')
}

export function addMedicine(params: {
  memberId: string
  memberName: string
  name: string
  dosage: string
  frequency: MedicineFrequency
  timing: string
  ongoing: boolean
  startDate: string
  endDate?: string
  notes?: string
}): Medicine {
  const med: Medicine = {
    medId: randomId(),
    createdAt: new Date().toISOString(),
    ...params,
  }
  const meds = listMedicines()
  meds.push(med)
  saveMedicines(meds)
  return med
}

export function updateMedicine(medId: string, updates: Partial<Omit<Medicine, 'medId' | 'createdAt'>>): void {
  const meds = listMedicines()
  const idx = meds.findIndex(m => m.medId === medId)
  if (idx === -1) return
  meds[idx] = { ...meds[idx], ...updates }
  saveMedicines(meds)
}

export function deleteMedicine(medId: string): void {
  saveMedicines(listMedicines().filter(m => m.medId !== medId))
}

export function getMedicinesByMember(memberId: string): Medicine[] {
  return listMedicines().filter(m => m.memberId === memberId)
}

// --- Vitals ---

export function listVitals(): Vital[] {
  try {
    return loadArray<Vital>(VITALS_KEY)
  } catch { return [] }
}

function saveVitals(vitals: Vital[]): void {
  persistSynced(VITALS_KEY, vitals, 'vitalId')
}

export function addVital(params: {
  memberId: string
  memberName: string
  type: VitalType
  value: string
  unit: string
  notes?: string
}): Vital {
  const vital: Vital = {
    vitalId: randomId(),
    recordedAt: new Date().toISOString(),
    ...params,
  }
  const vitals = listVitals()
  vitals.push(vital)
  saveVitals(vitals)
  return vital
}

export function deleteVital(vitalId: string): void {
  saveVitals(listVitals().filter(v => v.vitalId !== vitalId))
}

export function getVitalsByMember(memberId: string): Vital[] {
  return listVitals()
    .filter(v => v.memberId === memberId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
}

export function getLatestVitals(memberId: string): Record<string, Vital> {
  const vitals = getVitalsByMember(memberId)
  const latest: Record<string, Vital> = {}
  for (const v of vitals) {
    if (!latest[v.type]) latest[v.type] = v
  }
  return latest
}

// --- Doctors ---

export function listDoctors(): Doctor[] {
  try {
    return loadArray<Doctor>(DOCTORS_KEY)
  } catch { return [] }
}

function saveDoctors(doctors: Doctor[]): void {
  persistSynced(DOCTORS_KEY, doctors, 'doctorId')
}

export function addDoctor(params: {
  memberId: string
  memberName: string
  name: string
  speciality: string
  phone?: string
  address?: string
  notes?: string
}): Doctor {
  const doctor: Doctor = {
    doctorId: randomId(),
    createdAt: new Date().toISOString(),
    ...params,
  }
  const doctors = listDoctors()
  doctors.push(doctor)
  saveDoctors(doctors)
  return doctor
}

export function deleteDoctor(doctorId: string): void {
  saveDoctors(listDoctors().filter(d => d.doctorId !== doctorId))
}

export function getDoctorsByMember(memberId: string): Doctor[] {
  return listDoctors().filter(d => d.memberId === memberId)
}
