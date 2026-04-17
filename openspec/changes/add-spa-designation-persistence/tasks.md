# Tasks: Add SPA Designation Persistence

## 1. ISPADesignation Type

- [ ] 1.1 Add `ISPADesignation` to `src/types/pilot/PilotInterfaces.ts`
      as a discriminated union keyed on
      `type: SPADesignationType` and a `value` shape appropriate to
      that type
- [ ] 1.2 Export narrowing helpers: `isWeaponTypeDesignation`,
      `isTargetDesignation`, `isRangeBracketDesignation`, etc.
- [ ] 1.3 Ensure the union covers every `SPADesignationType` in the
      canonical catalog (weapon_type, weapon_category, target,
      range_bracket, skill, terrain)

## 2. IPilotAbilityRef Extension

- [ ] 2.1 Extend `IPilotAbilityRef` with an optional
      `designation?: ISPADesignation` field
- [ ] 2.2 Update the type guard `isPilot` if needed to tolerate the
      new field (it should remain permissive — designation is
      optional)
- [ ] 2.3 Update JSDoc comments explaining when designation is required
      versus omitted

## 3. PilotService Wiring

- [ ] 3.1 `PilotService.purchaseSPA` accepts an optional
      `designation?: ISPADesignation` argument and persists it on the
      pilot record
- [ ] 3.2 `PilotService.purchaseSPA` rejects any purchase where the
      SPA's `requiresDesignation === true` and no designation is
      supplied — error "Designation required for <displayName>"
- [ ] 3.3 `PilotService.purchaseSPA` rejects any purchase where
      `designation.type !== spa.designationType` — error "Designation
      type mismatch"

## 4. getPilotDesignation Helper

- [ ] 4.1 Add `getPilotDesignation(pilot: IPilot, spaId: string):
ISPADesignation | undefined` to `PilotService`
- [ ] 4.2 Helper resolves the SPA id through `resolveSPAId()` so
      callers can pass canonical or legacy ids
- [ ] 4.3 Helper returns `undefined` when the pilot does not own the
      SPA or the stored ref has no designation
- [ ] 4.4 Helper is pure — it reads the pilot record, does not mutate

## 5. Combat Layer Hand-off

- [ ] 5.1 Update `src/utils/gameplay/spaModifiers/` to use
      `getPilotDesignation` for every designation-dependent SPA read
- [ ] 5.2 Remove any ad-hoc designation lookups that reach into the
      pilot structure directly
- [ ] 5.3 Confirm Weapon Specialist reads designated weapon type from
      the pilot record
- [ ] 5.4 Confirm Gunnery Specialist reads designated weapon category
      from the pilot record
- [ ] 5.5 Confirm Blood Stalker reads designated target from the pilot
      record
- [ ] 5.6 Confirm Range Master reads designated range bracket from the
      pilot record
- [ ] 5.7 Confirm Oblique Attacker reads designated terrain from the
      pilot record

## 6. Serialization Compatibility

- [ ] 6.1 Verify that `IPilot` JSON round-trips with the new
      designation field (existing pilots without designation remain
      valid)
- [ ] 6.2 Add a migration note in the spec for existing stored pilots:
      absent designation means "none recorded" and the combat layer
      SHALL fall back to the placeholder behaviour described in
      `spa-combat-integration` until a designation is added
- [ ] 6.3 Confirm the Yjs / p2p-sync layer tolerates the extended
      shape (no new migration required — additive optional field)

## 7. Spec Compliance

- [ ] 7.1 Add `pilot-system` spec delta for the designation shape,
      storage, and retrieval helper
- [ ] 7.2 Add `spa-combat-integration` spec delta updating every
      designation-dependent SPA to read its designation from the pilot
      record via `getPilotDesignation`
- [ ] 7.3 Every new requirement has at least one GIVEN/WHEN/THEN
      scenario
- [ ] 7.4 Run `openspec validate add-spa-designation-persistence
--strict` clean

## 8. Tests

- [ ] 8.1 Unit test: purchasing Weapon Specialist without a
      designation is rejected
- [ ] 8.2 Unit test: purchasing Weapon Specialist with a
      `range_bracket` designation is rejected (type mismatch)
- [ ] 8.3 Unit test: purchasing Weapon Specialist with a valid
      `weapon_type` designation stores the designation on the ability
      ref
- [ ] 8.4 Unit test: `getPilotDesignation(pilot, "weapon_specialist")`
      returns the persisted designation
- [ ] 8.5 Unit test: `getPilotDesignation` returns undefined when the
      pilot does not own the SPA
- [ ] 8.6 Unit test: `getPilotDesignation` resolves legacy alias ids
- [ ] 8.7 Integration test: attack resolution for a pilot with
      Weapon Specialist (Medium Laser) firing a Medium Laser applies
      the -2 to-hit modifier
- [ ] 8.8 Integration test: attack resolution for a pilot with Blood
      Stalker and a stored target id applies -1 against that target
      and +2 against others
