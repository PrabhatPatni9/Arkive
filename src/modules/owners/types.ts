/**
 * Owner / Entity model (Build Brief v2 §5).
 *
 * Insurance policies and assets are not always held by a person — a factory policy may sit
 * under a HUF, a company car under a Pvt Ltd. The `Owner` abstraction lets both Insurance and
 * Asset records reference either a family member (a Person) or an `Entity` (a legal/organisational
 * owner), so ownership and tier-based sharing work uniformly across the app.
 */

export type EntityType =
  | 'individual'       // a natural person acting in a legal capacity (e.g. sole applicant)
  | 'HUF'              // Hindu Undivided Family — a sub-family unit
  | 'proprietorship'
  | 'partnership'
  | 'private_limited'
  | 'trust'
  | 'other'

/** The three key tiers plus per-record custom sharing (mirrors the crypto scope tiers). */
export type SharingTier = 'self' | 'node' | 'family' | 'custom'

export interface Entity {
  entityId: string
  familyId: string
  entityType: EntityType
  name: string
  /** Statutory identifiers, as applicable. Treated as sensitive PII (never plaintext on relay). */
  pan?: string
  gstin?: string
  cin?: string
  /** Family members associated with this entity (e.g. HUF members, company directors). */
  linkedMemberIds: string[]
  /** Default sharing tier, seeded from the entity type but user-overridable. */
  defaultTier: SharingTier
  createdAt: string
  updatedAt: string
}

export type EntityInput = Omit<Entity, 'entityId' | 'createdAt' | 'updatedAt'>

/**
 * An Owner is either a family member (Person) or an Entity. Insurance/Asset records reference
 * an Owner rather than hard-coding a memberId, so a policy can be held by "grandfather" or by
 * "Ratanmoti Texfab Pvt Ltd" through the same field.
 */
export type Owner =
  | { kind: 'person'; memberId: string }
  | { kind: 'entity'; entityId: string }

/**
 * The entity type suggests a sensible default sharing tier:
 *  - HUF → node (a sub-family unit),
 *  - partnership / private_limited / trust → family (a family-owned organisation),
 *  - individual / proprietorship / other → self.
 * The user can always override this on the record.
 */
export function defaultTierForEntityType(type: EntityType): SharingTier {
  switch (type) {
    case 'HUF':
      return 'node'
    case 'partnership':
    case 'private_limited':
    case 'trust':
      return 'family'
    case 'individual':
    case 'proprietorship':
    case 'other':
    default:
      return 'self'
  }
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  individual:      'Individual',
  HUF:             'HUF (Hindu Undivided Family)',
  proprietorship:  'Proprietorship',
  partnership:     'Partnership',
  private_limited: 'Private Limited',
  trust:           'Trust',
  other:           'Other',
}
