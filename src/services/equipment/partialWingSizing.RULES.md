# Mech Partial Wing formula ownership

`VARIABLE_EQUIPMENT_FORMULAS['partial-wing']` is the single formula record for
both equipment technologies. Its base is IS; a `TechBase.CLAN` override changes
mass and critical demand. `EquipmentCalculatorService` selects only by the
supplied equipment tech, without mutating the record or maintaining another
technology registry. The caller supplies the resolved definition's own tech.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- `MiscType.java:485-488` selects `RoundWeight.STANDARD`; `:498-503` uses 7%
  for the IS mech wing and 5% for Clan.
- `RoundWeight.java:56-68,92-95` uses gram-truncated next-half-ton rounding
  for a mech Entity; the kg predicates concern ProtoMek, BA and small support
  entities, which are separate wing kinds and outside this rule.
- `MiscType.java:2248-2275,2279-2305` defines eight IS versus six Clan
  ordinary criticals.
- `MiscType.java:995-996` charges `ceil(getTonnage(entity, loc, size) * 50000)`.
  This is wing tonnage, not chassis weight. Native half-ton wing mass makes
  that product integral; the existing MULTIPLY cost formula is exact.

The weight formula opts into `nativeTonRounding` and calls the existing
`roundSupportComponentWeight` helper, with kilograms disabled. No new rounding
helper or second percentage calculation exists. Other formulas do not opt in
and retain their previous behavior. Records without technology overrides use
the original calculation path. Custom overrides are validated by the same
formula validator and can use only the two tech-base keys.

Returned critical demand is ordinary count; the recovery/allocation owner
converts superheavy physical entries once. This PR adds no recovery, equipment
lookup alias, catalog record, ProtoMech wing or battle-armor wing behavior.
