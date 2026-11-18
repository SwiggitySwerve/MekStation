# Native critical equipment projection

Catalog critical counts describe ordinary criticals. At the source-loading
boundary, mounted equipment uses physical critical entries: the existing
`getEquipmentCritEntries` owner converts superheavy demand before matching
source positions. Apply it once to mapped mounts and recovered heat sinks,
ammunition and variable physical mounts. Keep standard demand, weights,
identities, explicit positions, rear flags and all existing recovery guards.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`Mek.java:3484-3492` halves entry demand, rounding up;
`MtfFile.java:1156-1166` applies the same rule to sized components;
`TestMek.java:438-477` checks the complete mounted allocation.

The fixed-slot topology reads the same entry conversion for engine and gyro
occupancy when the selected superheavy gyro identifies the paired frame.
Engine.java:609-641,653-696 and Mek.java:5940-5949 define the native system positions;
ordinary gyros retain ordinary engine/gyro occupancy.

## Mixed-tech identity

`MtfFile.java:1052` builds one mount per critical token, so the token names the
mount. A token's own Clan/IS marker comes before a neighbour's
(`ISERMediumLaser` beside `CLERMediumLaser` stays IS). On a mixed-tech unit, a
list entry with no free entry of its own id takes the free entries of its
other-tech twin (`er-medium-laser` / `clan-er-medium-laser`) and that twin's
identity, in physical entries like any other mapped mount.

## Shared source mounting facts

`sourceWeaponMounts.ts` owns the complete critical weapon census, summary
identity matching and reservations. The synchronous parser and runtime loader
consume that owner. Bundled catalog lookups supply fixed mass/counts; the
existing calculator and entry-conversion owners supply variable physical sizes.
All audited `sourceWeaponMountProfiles.json` identities are admitted, including
fixed shields, spikes and industrial tools categorized as miscellaneous. Its
`recover` flags describe the old PR-A admission and no longer gate recovery.
Other crit-only miscellaneous equipment remains outside this weapon boundary.

Pinned `MtfFile.java:545-548,1053-1068,1086-1175` loads in reverse native
location order, shares Talons across legs and joins eligible split weapons.
The existing slotOperations owner still decides split eligibility/adjacency.
Summary aliases consume one native mount each, including a split mount's inner
location. Ammo tokens never enter the weapon census even when ids are shared.
Explicit positions reserve their actual native group before missing groups are
recovered, including a later same-type mount in the same location.
Legacy superheavy saves can reserve more cells than the current entry demand.
Keep those explicit cells for validation; never recover extra weapons over
cells already reserved by existing equipment.
Incomplete groups and unknown tokens stay in the critical grid; incomplete
recognized weapons produce parser warnings. Source mount qualifiers remain
in the raw grid; rear and Omni flags also use existing serialized fields.
Explicit variable physical mounts are sized and reconciled on reload, while
unrepresented mounts are recovered for legacy saves. No catalog rewrite or
new persistence fields are required.

`physicalWeaponFormulas.json` owns the physical formula ASTs used by the
existing formula registry/evaluator. Fixed sizes and masses remain catalog
facts. The Claw/Claws aliases share one formula object and native slot identity.
The legacy enum fallbacks in `PhysicalWeaponTypes.ts` retain their old guards
and results; source recovery does not call them. BV formulas in
`scripts/validate-bv-physical-weapons.ts` measure a separate quantity and stay
with the BV owner. This extraction changes no source admissions or outputs.

## Crit-only CASE and electronics (PR-D1)

A source cell whose resolved id is an exact `criticalSlotEquipment` row in
`mtf-component-vocabulary.json`, and whose lookup token is one of that row's
listed spellings, is admitted (`CLCASE` resolves to IS `case` but is not a
listed spelling, so it is not mounted at the wrong mass); `classifyCriticalSlotRecoveryKind`
names it `case` or `electronics` through the one notice table. The dispatcher
recovers one mount per complete group of unreserved cells of that id at the
location (`MtfFile.java:1049-1140`, MegaMek 48fcb2f64), after source weapons,
so a targeting computer sees the recovered weapon list. Mass and criticals come
from the resolved definition, or from `createCalculatedEquipment` for the
targeting computer (`mountAs`, `MiscType.java:614-616,1098-1102`), converted
once to superheavy entries. An incomplete group, an unknown id, or a row whose
owner yields no criticals stays in the unrecovered residual. Omni pod flags use
the existing final token projection; rear flags come from the cells.
`CASE II [IS]`/`ISCASEII` identity stays with `resolveEquipmentId` (#3303).

A targeting computer is one mount per type per unit (`MtfFile.java:1076-1084`,
`hSharedEquip`): it is recovered only when every cell of that type in the unit
sits in one location and their total equals the owner's computed criticals,
and never when the unit already holds that TC. A listed TC without slots claims
the cells that resolve to its stub (the row's `mountAs`). Anything else, a
count mismatch or cells across locations, stays in the residual with its
notice.
