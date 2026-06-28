export type VitalType = 'bp' | 'blood_sugar' | 'weight' | 'spo2' | 'heart_rate' | 'temperature'

export const VITAL_LABELS: Record<VitalType, string> = {
  bp: 'Blood Pressure',
  blood_sugar: 'Blood Sugar',
  weight: 'Weight',
  spo2: 'SpO2',
  heart_rate: 'Heart Rate',
  temperature: 'Temperature',
}

export const VITAL_UNITS: Record<VitalType, string> = {
  bp: 'mmHg',
  blood_sugar: 'mg/dL',
  weight: 'kg',
  spo2: '%',
  heart_rate: 'bpm',
  temperature: '°C',
}

export type MedicineFrequency = 'once_daily' | 'twice_daily' | 'thrice_daily' | 'as_needed' | 'weekly'

export const FREQUENCY_LABELS: Record<MedicineFrequency, string> = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily',
  thrice_daily: 'Three times daily',
  as_needed: 'As needed',
  weekly: 'Weekly',
}

export interface Medicine {
  medId: string
  memberId: string
  memberName: string
  name: string
  dosage: string
  frequency: MedicineFrequency
  timing: string       // e.g. "after meals", "before bed"
  ongoing: boolean
  startDate: string
  endDate?: string
  notes?: string
  createdAt: string
}

export interface Vital {
  vitalId: string
  memberId: string
  memberName: string
  type: VitalType
  value: string        // BP: "120/80", others: numeric string
  unit: string
  recordedAt: string
  notes?: string
}

export interface Doctor {
  doctorId: string
  memberId: string     // which family member this doctor is for
  memberName: string
  name: string
  speciality: string
  phone?: string
  address?: string
  notes?: string
  createdAt: string
}
