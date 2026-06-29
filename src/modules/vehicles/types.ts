export type FuelType = 'petrol' | 'diesel' | 'electric' | 'cng' | 'hybrid'

export interface Vehicle {
  vehicleId: string
  familyId: string
  name: string              // user label, e.g. "Dad's Car"
  make: string
  model: string
  year: number
  registrationNumber: string
  fuelType: FuelType
  pucExpiry?: string        // YYYY-MM-DD
  insuranceExpiry?: string  // YYYY-MM-DD
  notes?: string
  createdAt: string
  updatedAt: string
}

export type VehicleInput = Omit<Vehicle, 'vehicleId' | 'createdAt' | 'updatedAt'>
