## Why

Current status (2026-09-12): the supported server-saved biped implementation shipped in PR 1635 and is synchronized to `openspec/specs/custom-unit-combat/spec.md` and the current mission contracts. The original motivation below is historical. This package remains active because its broader acceptance tasks are still unchecked; focused local proof does not close them.

Saved custom BattleMechs remain blocked at campaign launch even though the customizer persists their construction. The user requested recovery of the deferred non-3D work after the clean-main reset. The saved implementation spans catalog admission, engine setup, recovery, replay validation, and fog projection; restoring only the adapter would leave an incomplete authority boundary.

## What Changes

- Admit an exact server-saved custom reference only when its recorded construction is supported: a biped BattleMech matching the existing serialized-unit contract.
- Resolve construction on the authoritative server at launch and record an immutable construction snapshot in GameCreated.
- Recover, rewind, and replay from that recorded snapshot even if the library design later changes or disappears.
- Merge server-saved designs into the campaign picker and make readiness consume a validated custom combat catalog alongside the existing canonical catalog.
- Preserve fail-closed source identity, invalid-reference rejection, canonical behavior, and visibility filtering.

## Capabilities

### New Capabilities

- `custom-unit-combat`: persisted construction identity through initial adaptation, recorded history, recovery, and privacy projection.

### Modified Capabilities

- `mission-contracts`: allow supported custom references in an authoritative ready catalog while preserving the shared launch guard.

## Non-goals

3D models, model libraries, tactical presentation, new construction rules, new unit-type support, authentication changes, migrations, dependencies, commits, publication, and new customizer feature recommendations are excluded. Existing OpenSpec task checkboxes and canonical specs remain unchanged.

## Impact

The change touches unit services/API, combat adapter and seed projection, session setup/recovery, server bootstrap/recovery, replay schemas, fog filtering, and campaign readiness/picker consumers. It supersedes the blanket custom-combat exclusion in the earlier `add-saved-custom-unit-campaign-roster` proposal only for the supported server-saved construction path defined here. That earlier change's historical proof and unrelated work remain intact.

Authoritative baseline: [mission contracts](../../specs/mission-contracts/spec.md), [event store](../../specs/event-store/spec.md), and [multiplayer server](../../specs/multiplayer-server/spec.md). Parent acceptance requires fresh integration and durable recovery evidence, not archive contents or passing adapter tests alone.
