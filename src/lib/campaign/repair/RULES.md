# Campaign repair tickets

This module owns campaign ticket repair application, active-work classification and safe terminal pruning. It does not own salvage acceptance, roster readiness caches, prices or the standalone repair store.

## Pinned completion behavior

Rules follow MekHQ e7adc2c6f3b17ec8ad243d30843e22207fe935e4:

- `MekHQ/src/mekhq/gui/adapter/TaskTableMouseAdapter.java:168-175,249-259` routes normal GM fix through `succeed()` just like normal successful work.
- `MekHQ/src/mekhq/campaign/parts/Part.java:1433-1435,1515-1525` clears hits/settings through `fix()` on success.
- `MekHQ/src/mekhq/campaign/parts/Armor.java:365-374,463-468` limits the armor restored to stock available and consumes only that stock. With zero stock, normal GM fix restores zero armor; it does not conjure parts.
- `MekHQ/src/mekhq/gui/adapter/TaskTableMouseAdapter.java:221-245` separately handles `FIX_GM_ACQUIRE`, explicitly supplying armor/ammunition/replacements. That acquire operation is not K7 completion.

Therefore GM completion bypasses elapsed work time but blocks an atomic ticket when required parts are missing. It must have the target unit state. It reuses `applyCompletedRepair`, including the existing caps, missing-max fallbacks and per-kind behavior. Existing matched/reserved-part consumption rules remain owned by partsInventory; K8 owns changes there.

## Lifecycle and pruning

Active work is queued, in-progress or parts-needed. Completed and cancelled tickets are terminal. Terminal work is excluded from active bay rows, counts, totals and warnings immediately.

MekHQ derives outstanding work using `MekHQ/src/mekhq/campaign/unit/Unit.java:1237-1249` (parts still needing fixing); it has no matching persisted RepairTicket history. The following retention policy is MekStation compatibility behavior, not an upstream time limit:

- A repair pass may remove tickets already terminal at its start, but not tickets newly completed in that pass.
- Any pendingBattleOutcomes or recentlyAppliedOutcomes reference to a source match protects that match's terminal tickets as deduplication records. An applied outcome stays in recentlyAppliedOutcomes for 31 in-game days from its `appliedOn` (the campaign date it was applied on; see `lib/campaign/appliedOutcomes.ts`), so that is how long the protection lasts. It is counted in campaign days, never against the outcome's wall-clock `capturedAt`. This adds no persisted field to the tickets.
- processedBattleIds remains the outcome-application ledger. Pruning never erases it, repairs a unit or spends parts.
- Legacy saves load unchanged. Active projections ignore their terminal rows immediately; a later processing/save persists eligible cleanup. A historically broken GM completion is not automatically replayed or charged again.

## Ledger and authority

New GM approvals capture concrete unit and inventory changes using existing base-unit-state and inventory-lot effects plus the completed ticket effect. Absolute after-values preserve replay equality across JSON persistence. Old status-only effects are not reinterpreted. Co-op retains existing campaign save and journal authority fences; ApplyGmIntervention remains funds-only and this module adds no repair wire intent.
