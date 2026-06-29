export type ContactCategory =
  | 'doctor'
  | 'plumber'
  | 'electrician'
  | 'mechanic'
  | 'lawyer'
  | 'school'
  | 'other'

export interface Contact {
  contactId: string
  familyId: string
  name: string
  category: ContactCategory
  phone: string
  email?: string
  address?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ContactInput = Omit<Contact, 'contactId' | 'createdAt' | 'updatedAt'>
