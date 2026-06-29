export type DeviceCategory = 'appliance' | 'electronics' | 'furniture' | 'tool' | 'other'

export interface HomeDevice {
  deviceId: string
  familyId: string
  name: string
  category: DeviceCategory
  brand?: string
  model?: string
  purchaseDate?: string    // YYYY-MM-DD
  warrantyExpiry?: string  // YYYY-MM-DD
  notes?: string
  createdAt: string
  updatedAt: string
}

export type HomeDeviceInput = Omit<HomeDevice, 'deviceId' | 'createdAt' | 'updatedAt'>
