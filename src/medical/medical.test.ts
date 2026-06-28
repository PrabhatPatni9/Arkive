import { describe, it, expect, beforeEach } from 'vitest'

// localStorage stub for Node environment
const store: Record<string, string> = {}
/* eslint-disable @typescript-eslint/no-dynamic-delete */
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
} as Storage
/* eslint-enable @typescript-eslint/no-dynamic-delete */

import {
  listMedicines, addMedicine, deleteMedicine, getMedicinesByMember,
  listVitals, addVital, deleteVital, getVitalsByMember, getLatestVitals,
  listDoctors, addDoctor, deleteDoctor, getDoctorsByMember,
} from './medicalStore'

beforeEach(() => {
  localStorage.clear()
})

describe('medicines', () => {
  const base = {
    memberId: 'mem1',
    memberName: 'Alice',
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'twice_daily' as const,
    timing: 'after meals',
    ongoing: true,
    startDate: '2024-01-01',
  }

  it('starts empty', () => {
    expect(listMedicines()).toHaveLength(0)
  })

  it('adds a medicine', () => {
    const med = addMedicine(base)
    expect(med.medId).toBeTruthy()
    expect(listMedicines()).toHaveLength(1)
    expect(listMedicines()[0].name).toBe('Metformin')
  })

  it('filters by member', () => {
    addMedicine(base)
    addMedicine({ ...base, memberId: 'mem2', memberName: 'Bob', name: 'Aspirin' })
    const alice = getMedicinesByMember('mem1')
    expect(alice).toHaveLength(1)
    expect(alice[0].name).toBe('Metformin')
  })

  it('deletes a medicine', () => {
    const med = addMedicine(base)
    deleteMedicine(med.medId)
    expect(listMedicines()).toHaveLength(0)
  })

  it('stores endDate for non-ongoing medicines', () => {
    const med = addMedicine({ ...base, ongoing: false, endDate: '2024-03-01' })
    expect(listMedicines().find(m => m.medId === med.medId)?.endDate).toBe('2024-03-01')
  })
})

describe('vitals', () => {
  const base = {
    memberId: 'mem1',
    memberName: 'Alice',
    type: 'bp' as const,
    value: '120/80',
    unit: 'mmHg',
  }

  it('starts empty', () => {
    expect(listVitals()).toHaveLength(0)
  })

  it('adds a vital', () => {
    const v = addVital(base)
    expect(v.vitalId).toBeTruthy()
    expect(listVitals()).toHaveLength(1)
  })

  it('filters by member', () => {
    addVital(base)
    addVital({ ...base, memberId: 'mem2', memberName: 'Bob', type: 'weight', value: '70', unit: 'kg' })
    expect(getVitalsByMember('mem1')).toHaveLength(1)
    expect(getVitalsByMember('mem2')).toHaveLength(1)
  })

  it('deletes a vital', () => {
    const v = addVital(base)
    deleteVital(v.vitalId)
    expect(listVitals()).toHaveLength(0)
  })

  it('getLatestVitals returns most recent per type', () => {
    addVital({ ...base, value: '130/85' })
    addVital({ ...base, value: '120/80' })
    addVital({ ...base, memberId: 'mem1', memberName: 'Alice', type: 'weight', value: '75', unit: 'kg' })
    const latest = getLatestVitals('mem1')
    expect(Object.keys(latest)).toHaveLength(2)
    expect(latest['bp']).toBeTruthy()
    expect(latest['weight']).toBeTruthy()
  })
})

describe('doctors', () => {
  const base = {
    memberId: 'mem1',
    memberName: 'Alice',
    name: 'Sharma',
    speciality: 'Cardiologist',
    phone: '+91 9876543210',
  }

  it('starts empty', () => {
    expect(listDoctors()).toHaveLength(0)
  })

  it('adds a doctor', () => {
    const doc = addDoctor(base)
    expect(doc.doctorId).toBeTruthy()
    expect(listDoctors()[0].speciality).toBe('Cardiologist')
  })

  it('filters by member', () => {
    addDoctor(base)
    addDoctor({ ...base, memberId: 'mem2', memberName: 'Bob', name: 'Gupta' })
    expect(getDoctorsByMember('mem1')).toHaveLength(1)
  })

  it('deletes a doctor', () => {
    const doc = addDoctor(base)
    deleteDoctor(doc.doctorId)
    expect(listDoctors()).toHaveLength(0)
  })
})
