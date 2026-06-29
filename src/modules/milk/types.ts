export interface MilkEntry {
  entryId: string
  familyId: string
  date: string          // YYYY-MM-DD
  litres: number
  pricePerLitre: number
  createdAt: string
}

export type MilkEntryInput = Omit<MilkEntry, 'entryId' | 'createdAt'>
