## Why

Refit orders cannot be cancelled, and multiple open orders can overwrite the same unit's configuration during day advancement. K8 needs cancellation and admission guards without deleting old save data.

## What Changes

- The refit module owns open (proposed or in-progress) and active (in-progress) predicates, cancellation and conflict detection.
- New orders refuse when the unit already has an open order. Guests cannot mutate refits.
- Cancellation changes only status, preserving progress and history. No money or parts are credited because orders record no payments or reservations.
- Legacy duplicates round-trip intact and pause that unit's progress until explicit cancellation leaves one open order.
- The Mech Bay lists open orders with Cancel Refit controls; failed saves stay visible and retryable. Editor cancellation still leaves the editor without cancelling an existing order.

## Impact

- Affected specification: [campaign-refit-and-prestige](../../specs/campaign-refit-and-prestige/spec.md).
- K6 readiness reuses the active predicate with unchanged behavior and unchanged readiness tests.
- No schema, serialization, journal payload or transport changes. The campaign host persists through the existing versioned save path; guests read the saved record.
- No changes to salvage, repair, markets, refit costing or technology-hour allocation.
- Follow-up: refit purchasing/part reservations through finance and inventory.

## Authority and Caller Paths

| Entry | Path and coverage |
| --- | --- |
| Mech Bay | Existing customizer launch; new order panel calls cancellation by campaign and order ID. |
| Mission readiness / refit command bar | Same commit action; guard errors displayed; failed persistence retries the created order. |
| Direct store callers | Live campaign, guest, ownership and open-order admission checked before writes. |
| Day / multi-day advancement | Registered refit processor pauses duplicate open orders per unit and ignores cancelled orders. |
| Campaign fast-forward | Loops store advancement and therefore uses the same processor. |
| Co-op host | Versioned save persists order mutations; day intent acknowledgement precedes local pipeline and save. |
| Co-op guest | Creation and cancellation refuse before local mutation; saved orders remain visible. |
| Server / journal / P2P | No existing refit intent or refit ledger fields; keep current campaign save and mirror authority. |
| Combat execution / AI | InteractiveSession, GameEngine phases/runToCompletion, QuickResolve, quick game, pre-battle auto-resolve, AI and standalone SimulationRunner have no direct refit callers. |
| Persistence | Server serializer and browser persistence preserve all old duplicate orders and all terminal history. |

## Pinned Rule

MekHQ e7adc2c: `MekHQ/src/mekhq/campaign/parts/Refit.java` `begin` at 1173 refuses a second active refit; `cancel` at 1919 clears the refit and releases parts without a cash refund; `releaseNewPart` at 1950 returns acquired spares through the quartermaster while retaining arrival data and avoiding unobtained parts. `ForceShoppingList.removeOrdersForRefit` at 195 removes pending procurement, retaining purchased parts in transit. `Unit.java` at 8297 stores one refit per unit.
