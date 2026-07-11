# Arkive — Emergency-Driven Modules (design + build plan)

> Written by imagining a family in the middle of an actual emergency and asking: *what would we
> be desperate to have, one tap away, maybe on someone else's phone, maybe with no signal?*
> Every module below is a **natural extension of what already exists** (Owner/Entity, Asset,
> Contacts, Medical, Vault, Reminders, the sealed/break-glass tier). Each entry has: the emergency
> it serves, the data model (reusing existing types), the UX, sharing tier, and a build plan a
> future agent can pick up. Priorities are ordered; **P0 = build first**.
>
> Read `BUILD_PLAN.md §0` for the repo conventions (how to add a module) before starting any of these.

---

## The emergencies we are designing for

1. **Medical emergency** (accident, collapse, allergic reaction) — need blood group, allergies,
   current meds, conditions, ICE contacts, insurance card, preferred hospital — instantly, offline.
2. **Death / incapacitation** — family needs the will, nominees, account access map, funeral
   wishes, life-insurance details, sealed messages.
3. **Natural disaster / evacuation** — go-bag, meeting point, out-of-area contact, cash & critical
   docs offline.
4. **Home emergency** (fire, gas leak, flood) — shutoff locations, home insurance, key holders,
   emergency services.
5. **Lost / stolen phone or wallet** — IMEI, card-block numbers, document reissue steps, remote
   device revoke.
6. **Travel emergency** — passport/visa, travel insurance, embassy, medical-abroad.
7. **Vehicle accident / breakdown** — RC, DL, insurance, roadside assistance, post-accident steps.
8. **Child / elderly / dependent emergency** — caregiver instructions, routine, school, allergies.
9. **Pet emergency** — vet, medications, feeding, microchip.

---

## P0 — Emergency Action Center (extend the existing Emergency screen)

**Serves:** every medical emergency. **This is the highest-value addition.**

Today `/emergency` shows critical fields. Turn it into an **action** surface, not just a display:
- **One-tap dial** row: Ambulance (112 / 108 in India), the member's primary ICE contact, and the
  family doctor. Uses `tel:` links (already used in `ContactsScreen`).
- **"Show insurance card"** — jump to the relevant health policy (from the `insurance` module).
- **"Navigate to preferred hospital"** — `geo:`/maps link from a new member field.
- **"Share medical summary"** — trigger the Emergency Medical Summary PDF (see `BUILD_PLAN.md` C3).

**Data model:** extend `FamilyMember` (in `familyStore.ts`) with optional `preferredHospital?:
string`, `organDonor?: boolean`, `primaryIceContactId?: string` (→ a Contact). No new store needed.

**UX:** big, high-contrast, thumb-sized action buttons at the top of `/emergency`; the existing
info cards below. Works offline (all data local). Reuses the red `--danger` accent and the new
persistent Emergency button already added to the app shell.

**Build plan:**
1. Add the optional member fields + edit UI on `EmergencyCardScreen`.
2. Add the action row to `EmergencyScreen` (dial / hospital / insurance / summary).
3. Test the data plumbing; no network in the emergency path.

---

## P0 — ICE Directory (extend Contacts)

**Serves:** medical, home, vehicle, travel emergencies.

Contacts already has a `category` enum and one-tap dial. Add an **emergency** category and a pinned
"ICE" section that surfaces: emergency services, family doctor, preferred hospital, insurance
helplines, roadside assistance, gas/electric emergency, poison control. Seed a **default set of
national emergency numbers** on first run (India: 112/108/101/100/1091/1098) that the family can edit.

**Data model:** reuse `Contact`; add `'emergency'` and `'utility'` to `ContactCategory`; add an
optional `pinnedForEmergency: boolean`. **Build:** extend `contacts/types.ts` + a seeding helper +
an "ICE" filter chip on `ContactsScreen`. Small, high value.

---

## P1 — Digital Legacy ("If Something Happens to Me")

**Serves:** death / incapacitation.

A sealed, break-glass module: where the will is, nominee/beneficiary map, account-access
*instructions* (never raw passwords on the relay), funeral/last wishes, and sealed messages to
specific members. This is a **natural extension of the existing sealed/private tier + Shamir
break-glass** (§6 of the brief): the owner writes it privately; on a threshold break-glass it opens.

**Data model:** new `src/modules/legacy/types.ts`:
```
LegacyRecord { id, familyId, kind: 'will_location'|'nominee_map'|'account_access'|'funeral_wish'|'sealed_message',
               title, body (encrypted), recipientMemberIds?, sharingTier: 'private'|'custom', createdAt, updatedAt }
```
Store via `secureModuleStore` (sealed). **Build:** module + screen + wire "open on break-glass" to
the threshold flow (Task B4 dependency). Emphasize in UI: store *instructions and locations*, not
live credentials.

---

## P1 — Nominee & Beneficiary Map (aggregate view, no new store)

**Serves:** death / financial emergency.

A read-only screen that scans existing records and answers "who is the nominee on what?" — pulls
`beneficiaryMemberIds` from `insurance`, plus asset owners, plus legacy nominee records, into one
list per person. **Build:** a pure aggregator screen over existing stores; no new data model.
High value, low effort.

---

## P1 — Go-Bag & Disaster Readiness (extend Reminders/checklists)

**Serves:** natural disaster / evacuation.

A templated checklist (documents, meds, cash, chargers, water) + a **family meeting point** + an
**out-of-area contact** (the person everyone calls if local lines are down). Extends the reminder/
checklist idea.

**Data model:** new light `src/modules/gobag/types.ts` — `ChecklistItem { id, familyId, label,
done, category }` + a small `DisasterPlan { meetingPoint, outOfAreaContactId }`. Store via
`secureModuleStore`. **Build:** module + screen with a "reset checklist" action + a pre-seeded
default template.

---

## P2 — Home Emergency (extend Assets: real_estate)

**Serves:** fire / gas / flood.

Per home (an `Asset` of type `real_estate`): gas/water/electricity **shutoff locations** (text +
optional photo in the vault), home-insurance link, key holders (Contacts), building/society
emergency number. **Build:** extend the Asset record with an optional `homeEmergency` sub-object;
surface on the Asset detail; no new module.

---

## P2 — Lost/Stolen Kit (extend Identity + Device registry)

**Serves:** lost phone / wallet.

Card-block helpline numbers, document **reissue steps** (Aadhaar/PAN/passport/DL), and the device
IMEI registry (brief §6). Ties into the **device-revoke** endpoint (Task B1) so a stolen phone can
be cut off. IMEI/serials are PII → never plaintext on the relay (already the rule). **Build:**
extend `identity` + a small `devices` list with IMEI; link to the revoke action.

---

## P2 — Travel Safe (extend Identity + Insurance travel type)

**Serves:** travel emergencies.

Per trip: passport/visa (Vault docs), the `travel` insurance policy (already a policy type), local
emergency numbers for the destination, nearest embassy, and a medical-abroad summary (reuse the
Emergency Medical Summary PDF). **Build:** a `trips` light module referencing existing Vault docs +
insurance; mostly aggregation.

---

## P3 — Pet Care & Emergency (new light module)

**Serves:** pet emergencies. A pet profile: species/breed, vet (Contact), medications, feeding,
microchip, vaccination due dates (→ reminders). Straightforward `secureModuleStore` module +
screen, mirroring the Contacts pattern.

---

## Suggested build order (dependency-aware)

1. **P0 Emergency Action Center** + **P0 ICE Directory** — biggest safety payoff, small effort,
   pure extensions. Do these first.
2. **Emergency Medical Summary PDF** (`BUILD_PLAN.md` C3) — the medical payoff; the Action Center
   links to it.
3. **P1 Nominee Map** (trivial aggregator) → **P1 Go-Bag** → **P1 Digital Legacy** (needs Shamir
   break-glass, Task B4).
4. **P2** Home Emergency, Lost/Stolen Kit, Travel Safe.
5. **P3** Pet Care.

## Ground rules for all of these (do not violate)
- Every new module uses `secureModuleStore` (encrypted at rest) and is family-scoped.
- Additive only — never remove or restyle existing screens; register each as a feature-flagged
  module (off by default) with a Home card + Settings toggle + route + `en` label.
- The emergency read paths must work **fully offline** — no network call to view critical info.
- Keep the UI simple and readable: the established header + card-list + bottom-sheet pattern.
  Big, high-contrast, thumb-friendly targets on anything used mid-emergency.
- Match the existing tests: a `<name>.test.ts` covering CRUD + family scoping for each module.
