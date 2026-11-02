# Unit string references

`UnitIndex.ts` owns `parseUnitReference`, `formatUnitReference` and the existing
`unitFamilyKey` namespace. A bare reference means BattleMech. A non-mech reference
records both family and source id, for example `aerospace:tomahawk-c`.

Force assignment `unitId`, picker/roster `unitId`, and encounter/session `unitRef`
carry this opaque reference unchanged. Their existing persistence and API shapes
remain valid; existing bare-id saves need no migration. Readers resolve the
reference at the browser or Node canonical catalog boundary. Cache lookup and
invalidation use the same decoded identity. Explicit lookup family options must
agree with a qualified reference, and a qualified reference must have an id.

Pre-battle combat admission lives in `preBattleSessionBuilder.ts`. It admits
BattleMechs, vehicles and aerospace. The picker calls that policy; capital ships
remain read-only, and Battle Armor, infantry and ProtoMech combat are unavailable.
Missing force units fail before session construction rather than shifting slots.

Enforcement: `nonMechReferences.integration.test.ts` persists both `tomahawk-c`
identities in a real force, resolves each in browser/Node catalogs, checks force
BV against the shared owner, and completes/replays a mixed catalog skirmish.
`UnitPicker.family.test.tsx` covers family selection and collision filtering.
`usePreBattleSkirmish.test.ts` checks instance-scoped construction seeds.

This surface slice does not change the strict 21-key BattleMech custom snapshot.
Saved non-mech snapshot admission and SimulationRunner family hydration/damage
remain the next UL-24 slice; the mixed proof uses the GameEngine session path.
