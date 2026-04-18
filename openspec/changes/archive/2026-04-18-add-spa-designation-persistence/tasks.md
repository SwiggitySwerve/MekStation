# Tasks: Add SPA Designation Persistence

## 1. ISPADesignation Type

- [x] 1.1 Add `ISPADesignation` to `src/types/pilot/PilotInterfaces.ts`
      as a discriminated union keyed on
      `type: SPADesignationType` and a `value` shape appropriate to
      that type
      (lives in dedicated module `src/types/pilot/SPADesignation.ts`,
      re-exported via `src/types/pilot/index.ts`; discriminator named
      `kind` with per-variant payload shape)
- [x] 1.2 Export narrowing helpers: `isWeaponTypeDesignation`,
      `isTargetDesignation`, `isRangeBracketDesignation`, etc.
- [x] 1.3 Ensure the union covers every `SPADesignationType` in the
      canonical catalog (weapon_type, weapon_category, target,
      range_bracket, skill, terrain)
      (also adds `attribute` + `edge_trigger` variants per Wave 2b
      designation catalog)

## 2. IPilotAbilityRef Extension

- [x] 2.1 Extend `IPilotAbilityRef` with an optional
      `designation?: ISPADesignation` field
- [x] 2.2 Update the type guard `isPilot` if needed to tolerate the
      new field (it should remain permissive — designation is
      optional)
- [x] 2.3 Update JSDoc comments explaining when designation is required
      versus omitted

## 3. PilotService Wiring

- [x] 3.1 `PilotService.purchaseSPA` accepts an optional
      `designation?: ISPADesignation` argument and persists it on the
      pilot record
- [x] 3.2 `PilotService.purchaseSPA` rejects any purchase where the
      SPA's `requiresDesignation === true` and no designation is
      supplied — error "Designation required for <displayName>"
- [x] 3.3 `PilotService.purchaseSPA` rejects any purchase where
      `designation.type !== spa.designationType` — error "Designation
      type mismatch"

## 4. getPilotDesignation Helper

- [x] 4.1 Add `getPilotDesignation(pilot: IPilot, spaId: string):
ISPADesignation | undefined` to `PilotService`
- [x] 4.2 Helper resolves the SPA id through `resolveSPAId()` so
      callers can pass canonical or legacy ids
- [x] 4.3 Helper returns `undefined` when the pilot does not own the
      SPA or the stored ref has no designation
- [x] 4.4 Helper is pure — it reads the pilot record, does not mutate

## 5. Combat Layer Hand-off

- [x] 5.1 Update `src/utils/gameplay/spaModifiers/` to use
      `getPilotDesignation` for every designation-dependent SPA read
      (centralized in `populateAttackerDesignations(pilot, base)` —
      typed→flat bridge invoked once per attack from
      `gameSessionAttackResolution`)
- [x] 5.2 Remove any ad-hoc designation lookups that reach into the
      pilot structure directly
- [x] 5.3 Confirm Weapon Specialist reads designated weapon type from
      the pilot record
- [x] 5.4 Confirm Gunnery Specialist reads designated weapon category
      from the pilot record
- [x] 5.5 Confirm Blood Stalker reads designated target from the pilot
      record (`targetUnitId`; empty/deferred ids skipped)
- [x] 5.6 Confirm Range Master reads designated range bracket from the
      pilot record
- [ ] 5.7 Confirm Oblique Attacker reads designated terrain from the
      pilot record → deferred: terrain designation is captured + persisted
      but combat-side terrain consumption (Oblique Attacker, Terrain
      Master, Environmental Specialist) not yet wired into
      `populateAttackerDesignations` — TODOs inline; tracked for a
      future combat-side change

## 6. Serialization Compatibility

- [x] 6.1 Verify that `IPilot` JSON round-trips with the new
      designation field (existing pilots without designation remain
      valid)
      (SQLite columns `designation_kind` + `designation_value` keep
      legacy stub rows loadable via `legacyDesignationToTyped` migrator)
- [x] 6.2 Add a migration note in the spec for existing stored pilots:
      absent designation means "none recorded" and the combat layer
      SHALL fall back to the placeholder behaviour described in
      `spa-combat-integration` until a designation is added
- [x] 6.3 Confirm the Yjs / p2p-sync layer tolerates the extended
      shape (no new migration required — additive optional field)

## 7. Spec Compliance

- [x] 7.1 Add `pilot-system` spec delta for the designation shape,
      storage, and retrieval helper
- [x] 7.2 Add `spa-combat-integration` spec delta updating every
      designation-dependent SPA to read its designation from the pilot
      record via `getPilotDesignation`
- [x] 7.3 Every new requirement has at least one GIVEN/WHEN/THEN
      scenario
- [x] 7.4 Run `openspec validate add-spa-designation-persistence
--strict` clean

## 8. Tests

- [x] 8.1 Unit test: purchasing Weapon Specialist without a
      designation is rejected
- [x] 8.2 Unit test: purchasing Weapon Specialist with a
      `range_bracket` designation is rejected (type mismatch)
- [x] 8.3 Unit test: purchasing Weapon Specialist with a valid
      `weapon_type` designation stores the designation on the ability
      ref
- [x] 8.4 Unit test: `getPilotDesignation(pilot, "weapon_specialist")`
      returns the persisted designation
- [x] 8.5 Unit test: `getPilotDesignation` returns undefined when the
      pilot does not own the SPA
- [x] 8.6 Unit test: `getPilotDesignation` resolves legacy alias ids
- [ ] 8.7 Integration test: attack resolution for a pilot with
      Weapon Specialist (Medium Laser) firing a Medium Laser applies
      the -2 to-hit modifier → deferred: bridge tested via
      `populateAttackerDesignations` + `spaModifiers.test.ts` +
      `weaponSpecialists.regression.test.ts`; full pilot→attack-
      resolution integration assertion still pending
- [ ] 8.8 Integration test: attack resolution for a pilot with Blood
      Stalker and a stored target id applies -1 against that target
      and +2 against others → deferred: same as 8.7 — bridge tested in
      isolation; awaiting end-to-end combat fixture
