import type { Contact, ContactInput } from './types'
import { loadArray } from '../secureModuleStore'
import { persistSynced } from '../../sync/syncContext'

const KEY = 'arkive_contacts_v1'

function randomId(): string { return Math.random().toString(36).slice(2, 18) }

function loadAll(): Contact[] {
  return loadArray<Contact>(KEY)
}

function saveAll(contacts: Contact[]): void {
  persistSynced(KEY, contacts, 'contactId')
}

export function getContacts(familyId: string): Contact[] {
  return loadAll().filter(c => c.familyId === familyId)
}

export function addContact(input: ContactInput): Contact {
  const now = new Date().toISOString()
  const contact: Contact = { ...input, contactId: randomId(), createdAt: now, updatedAt: now }
  const all = loadAll()
  all.push(contact)
  saveAll(all)
  return contact
}

export function updateContact(contactId: string, updates: Partial<ContactInput>): void {
  const all = loadAll()
  const idx = all.findIndex(c => c.contactId === contactId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  saveAll(all)
}

export function deleteContact(contactId: string): void {
  saveAll(loadAll().filter(c => c.contactId !== contactId))
}
