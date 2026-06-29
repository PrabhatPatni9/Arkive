export type ModuleId =
  | 'insurance'
  | 'vehicles'
  | 'expenses'
  | 'milk'
  | 'contacts'
  | 'home_devices'
  | 'identity'

export interface ModuleMeta {
  id: ModuleId
  route: string
  labelKey: string
  defaultEnabled: boolean
}

export const MODULE_REGISTRY: ModuleMeta[] = [
  { id: 'insurance',    route: '/insurance',    labelKey: 'modules.insurance',    defaultEnabled: false },
  { id: 'vehicles',     route: '/vehicles',     labelKey: 'modules.vehicles',     defaultEnabled: false },
  { id: 'expenses',     route: '/expenses',     labelKey: 'modules.expenses',     defaultEnabled: false },
  { id: 'milk',         route: '/milk',         labelKey: 'modules.milk',         defaultEnabled: false },
  { id: 'contacts',     route: '/contacts',     labelKey: 'modules.contacts',     defaultEnabled: false },
  { id: 'home_devices', route: '/home-devices', labelKey: 'modules.home_devices', defaultEnabled: false },
  { id: 'identity',     route: '/identity',     labelKey: 'modules.identity',     defaultEnabled: true  },
]
