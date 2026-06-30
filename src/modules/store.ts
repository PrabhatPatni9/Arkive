import type { ModuleId } from './types'
import { MODULE_REGISTRY } from './types'

const FLAGS_KEY = 'arkive_modules_v1'

type FlagMap = Record<string, boolean>

// Module-level cache so repeated calls in the same render don't re-parse localStorage.
let _flagsCache: FlagMap | null = null

function loadFlags(): FlagMap {
  if (_flagsCache) return _flagsCache
  try {
    const raw = localStorage.getItem(FLAGS_KEY)
    _flagsCache = raw ? (JSON.parse(raw) as FlagMap) : {}
  } catch { _flagsCache = {} }
  return _flagsCache
}

function saveFlags(flags: FlagMap): void {
  _flagsCache = flags
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags))
}

export function isModuleEnabled(id: ModuleId): boolean {
  const flags = loadFlags()
  if (id in flags) return flags[id]
  return MODULE_REGISTRY.find(m => m.id === id)?.defaultEnabled ?? false
}

export function setModuleEnabled(id: ModuleId, enabled: boolean): void {
  const flags = loadFlags()
  flags[id] = enabled
  saveFlags(flags)
}

export function getAllModuleStates(): Record<ModuleId, boolean> {
  const flags = loadFlags()
  const result = {} as Record<ModuleId, boolean>
  for (const m of MODULE_REGISTRY) {
    result[m.id] = m.id in flags ? flags[m.id] : m.defaultEnabled
  }
  return result
}
