# Customizer and specification inventory overview

As of 2026-09-12, the immutable reconciliation inventory records **220 canonical specifications**, **13 original active packages**, and **3 authorized archive moves**. The current local workspace contains **12 active change directories**; this is not a main-state claim. The catalog in this guide follows [inventory.json](inventory.json), with the source tables retained in [inventory.md](inventory.md) and the reconciliation boundary described in [README.md](README.md). Current delivery and publication state belongs to the roadmap receipts, not the initial inventory counts.

## How to read the inventory

A canonical specification means that a requirement exists under `openspec/specs/`; it does not mean the requirement is implemented, tested, or currently enabled in production. The directory below therefore records requirement coverage and reconciliation bookkeeping, while the active-package table records the evidence still needed.

The `Initial triage` column preserves the historical reconciliation labels. The labels are not counts of missing features: **37 existing canonical specs were updated and 3 canonical specs were added**. The **22 needs-proof** and **18 preserve-planned** values are historical review partitions. A spec marked retained can still need runtime proof; a changed spec can still have an implementation or acceptance gap.

## Inventory snapshot and current workspace boundary

| Surface                           |                                                              Count | What the count means                                                                         |
| --------------------------------- | -----------------------------------------------------------------: | -------------------------------------------------------------------------------------------- |
| Canonical specifications          |                                                                220 | Immutable inventory requirement directories; current set equality remains a structural fact. |
| Baseline canonical specifications |                                                                217 | Reconciliation comparison set.                                                               |
| Existing canonical specs updated  |                                                                 37 | Existing requirements/reference text changed during reconciliation.                          |
| New canonical specs               |                                                                  3 | `battlemech-chassis-index`, `custom-unit-combat`, and `customizer-edit-recovery`.            |
| Original active packages          |                                                                 13 | Immutable inventory admission count, not the current directory count.                        |
| Current active change directories |                                                                 12 | Direct local workspace inventory; it is not a main-state claim.                              |
| Authorized archive moves          |                                                                  3 | Local reconciliation moves; chassis and equipment remain publication/main-proof pending.     |
| Historical initial triage         | 158 unaffected; 19 update-now; 22 needs-proof; 18 preserve-planned | Review labels only; they do not establish feature absence or runtime completion.             |

Routing closure is separately archived and verified on main through PR #1639. Only the customizer-CI contract-modules PR #1647 is complete; broader wiring, tests, and remote activation remain open. Browser boundary commit `77d9a9480a3a47b1849f166db01278f93f3d8094` is local and publication-blocked. Nothing here reclassifies deferred Infantry, ProtoMech, HUD, or simulation scope.

## Original packages and current dispositions

The rows preserve the 13 original package links and original task-checkbox counts. Their status text records the current local, merged-main, or publication-blocked disposition; it does not make the initial package count a live ledger.

| Package                                                                                                                                                                                                                                           | Scope                                                                                                                                                                         | Ledger/status                                                                   | Next evidence                                                                                                                                                                                                                       | Dependencies                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [add-authoritative-history-branches](../../../openspec/changes/add-authoritative-history-branches/proposal.md) ([tasks](../../../openspec/changes/add-authoritative-history-branches/tasks.md))                                                   | Immutable branch lineage, candidate correction, lease/fence, activation, rebuild, and audit history.                                                                          | 7 complete / 39 open                                                            | PR 1–3 may proceed on their narrowed branch-storage/combat seams; PR 4+ requires current exact-main cross-stream predecessor evidence, then campaign replacement, activation/rebuild/rollback tests and independent lineage review. | add-cross-stream-effect-receipts; harden-gm-two-player-campaign-sessions                                         |
| [add-camp01-authority-receipts](../../../openspec/changes/add-camp01-authority-receipts/proposal.md) ([tasks](../../../openspec/changes/add-camp01-authority-receipts/tasks.md))                                                                  | CAMP-01 receipt writer/validator/controller, immutable command rows, exact-SHA provenance, durable exports, and cleanup.                                                      | 19 complete / 0 open; active parent gate                                        | Run the parent CAMP-01H/9.1 exact-main handoff and refresh provenance before archive; roster and journey consume the durable receipt.                                                                                               | add-saved-custom-unit-campaign-roster; prove-saved-custom-unit-campaign-journey                                  |
| [add-cross-stream-effect-receipts](../../../openspec/changes/add-cross-stream-effect-receipts/proposal.md) ([tasks](../../../openspec/changes/add-cross-stream-effect-receipts/tasks.md))                                                         | Durable source outbox, target inbox receipt, canonical semantic-command bytes, idempotent delivery, and linked cross-stream timeline.                                         | 0 complete / 51 open; implementation gated on predecessors                      | Verify journal-backed combat/campaign predecessors on exact main, then canonicalizer fixtures, outbox/inbox failure injection, and acceptance receipts.                                                                             | design-campaign-authority-and-sync; adopt-combat-journal-cutover-and-gm-rewind; must precede branches            |
| [add-customizer-pr-regression-gate](../../../openspec/changes/add-customizer-pr-regression-gate/proposal.md) ([tasks](../../../openspec/changes/add-customizer-pr-regression-gate/tasks.md))                                                      | Pull-request gate for the three customizer packs: equipment catalog (3), record-sheet rendering (6), edit recovery (3), with strict assets and production server.             | 19 complete / 1 open                                                            | Observe the new required PR check and aggregator on a real PR. The final browser local verification for `77d9a9480a3a47b1849f166db01278f93f3d8094` has its own 12-case proof; it does not establish remote activation.              | Narrow customizer lane                                                                                           |
| [add-saved-custom-unit-campaign-roster](../../../openspec/changes/add-saved-custom-unit-campaign-roster/proposal.md) ([tasks](../../../openspec/changes/add-saved-custom-unit-campaign-roster/tasks.md))                                          | Saved-design roster group, explicit custom source/ref provenance, minted roster instances, Mech Bay resolution, and server commit before navigation.                          | 0 complete / 28 open; shipped slices remain unreceipted                         | Consume the synchronized custom-combat boundary, map the 28 broad boxes to current receipts, and prove the full campaign handoff on exact main; isolated shipped slices do not close this package.                                  | add-camp01-authority-receipts; enable-saved-custom-unit-combat; prove-saved-custom-unit-campaign-journey         |
| [adopt-combat-journal-cutover-and-gm-rewind](../../../openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/proposal.md) ([tasks](../../../openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/tasks.md))                           | Production combat journal cutover plus live GM preview/commit, replacement branches, stale-branch rejection, and viewer/fog rebuild.                                          | 0 complete / 17 open; original boxes unchanged, local precursor evidence exists | Local matrix maps source assertions only: 80 rows, 34 real, 6 strict expected failures, 40 missing. Prepared campaign-authority API is local only; implement cutover seams and run integrated proof.                                | harden-gm-two-player-campaign-sessions; add-authoritative-history-branches; design-campaign-authority-and-sync   |
| [design-campaign-authority-and-sync](../../../openspec/changes/design-campaign-authority-and-sync/proposal.md) ([tasks](../../../openspec/changes/design-campaign-authority-and-sync/tasks.md))                                                   | Server-authoritative campaign state, replication grants, access projections, cursor catch-up, and per-campaign authority mode.                                                | 26 complete / 0 open; implemented subslices with scoped nonclaims               | Refresh exact-main authority evidence and decide archive/successor treatment while carrying the production journal flag, host-view split, and full-journey nonclaims.                                                               | add-camp01-authority-receipts; harden-gm-two-player-campaign-sessions                                            |
| [design-vault-campaign-separation-and-maps](../../../openspec/changes/design-vault-campaign-separation-and-maps/proposal.md) ([tasks](../../../openspec/changes/design-vault-campaign-separation-and-maps/tasks.md))                              | Versioned personal vault templates and campaign instances, explicit source provenance, starmap travel economy/opportunities, and future isometric projection.                 | 1 complete / 27 open; prerequisite only                                         | Preserve occupied v2 authority metadata and admit the compatible provenance rung (v2→v3 unless a reviewed alternative); then implement travel, opportunities, and map projection.                                                   | add-saved-custom-unit-campaign-roster; add-camp01-authority-receipts                                             |
| [enable-saved-custom-unit-combat](../../../openspec/changes/enable-saved-custom-unit-combat/proposal.md) ([tasks](../../../openspec/changes/enable-saved-custom-unit-combat/tasks.md))                                                            | Supported server-saved biped custom references, immutable GameCreated construction snapshots, recovery/replay/fog, and campaign admission.                                    | 0 complete / 6 open; implementation report exists                               | Map the six broad boxes to the existing implementation report and durable receipts, then rerun integrated exact-head proof before archive.                                                                                          | add-saved-custom-unit-campaign-roster; harden-gm-two-player-campaign-sessions                                    |
| [fix-customizer-explicit-tab-precedence](../../../openspec/changes/archive/2026-09-12-fix-customizer-explicit-tab-precedence/proposal.md) ([tasks](../../../openspec/changes/archive/2026-09-12-fix-customizer-explicit-tab-precedence/tasks.md)) | Explicit valid Structure route segments must outrank saved last-subtab state while omitted/invalid routes retain existing behavior.                                           | 4 complete / 0 open; archived on main                                           | Routing closure is recorded separately at PR #1639; it is no longer a current active package.                                                                                                                                       | Narrow customizer lane                                                                                           |
| [harden-gm-two-player-campaign-sessions](../../../openspec/changes/harden-gm-two-player-campaign-sessions/proposal.md) ([tasks](../../../openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md))                                       | Program umbrella for durable campaign-session authority, membership, visibility projections, correction/rewind, outcome receipts, responsiveness, and 80-scenario acceptance. | 83 complete / 25 open; partial umbrella                                         | Close remaining schema/projection/privacy/performance/E2E gates; combat rewind is explicitly moved behind journal-cutover, with 34/80 reachable at the split and six expected failures retained.                                    | adopt-combat-journal-cutover-and-gm-rewind; add-cross-stream-effect-receipts; add-authoritative-history-branches |
| [prove-saved-custom-unit-campaign-journey](../../../openspec/changes/prove-saved-custom-unit-campaign-journey/proposal.md) ([tasks](../../../openspec/changes/prove-saved-custom-unit-campaign-journey/tasks.md))                                 | Final CAMP-01H three-witness proof: save/reload, campaign readiness, canonical combat/post-battle, experience reconciliation, and repair loop.                                | 0 complete / 9 open; verification work                                          | Issue three writer-owned contexts, prove route/API/store/persistence/navigation/reload authority, run all six immutable commands, and repair or disposition findings before rerun.                                                  | add-camp01-authority-receipts; add-saved-custom-unit-campaign-roster; enable-saved-custom-unit-combat            |
| [repair-record-sheet-rendering](../../../openspec/changes/repair-record-sheet-rendering/proposal.md) ([tasks](../../../openspec/changes/repair-record-sheet-rendering/tasks.md))                                                                  | Shared SVG/4x PNG record-sheet preview/export/print, bounded geometry, zoom/currentness, cleanup, and readable critical tables.                                               | 14 complete / 0 open; local-verified, active pending closure                    | Shared preview delivery has scoped local evidence; browser proof remains identified by its own receipt and publication/main closure stays separate.                                                                                 | Narrow customizer lane                                                                                           |

## What still needs updating or proof

The customizer, record-sheet, equipment, persistence, chassis, and supported-custom-combat wording identified by this reconciliation has been updated. The remaining work is concentrated in status/evidence alignment and the larger planned changes:

| Area                                    | Required next update                                                                                                                                     | Why it remains open                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Saved custom-unit combat                | Map each of the six broad unchecked tasks to current implementation and acceptance receipts; split any residual work into named tasks.                   | The implementation report and 22 focused contract checks do not cover every package acceptance condition. The canonical supported-biped boundary is already synchronized. |
| Campaign roster and final journey       | Refresh the parent CAMP-01H/9.1 evidence, preserve three distinct witnesses, and align task completion with durable save/readiness/post-battle receipts. | Roster code and browser tests already exist, but an unchecked parent evidence gate is not closed by nearby test counts.                                                   |
| Campaign authority and receipt tooling  | Reconcile checked boxes with their scoped nonclaims and refresh evidence on the current main commit before deciding archive or successor scope.          | Campaign authority has 26/0 boxes and receipt tooling 19/0, yet those totals alone do not prove full live authority/cutover behavior.                                     |
| GM umbrella and history branches        | Keep the journal-cutover successor, the 80-scenario reachability table, and the PR1–3 versus PR4+ dependency amendment aligned with actual receipts.     | The umbrella and branch package contain real partial implementation, remaining failures, and deferred activation/correction work.                                         |
| Vault/campaign/maps                     | Preserve occupied v2 authority metadata, admit the compatible provenance migration rung, and recheck travel/UI prerequisites before implementation.      | Explicit source/provenance, v2→v3 compatibility, travel/opportunities, and isometric work remain planned.                                                                 |
| Customizer CI                           | Keep PR #1647 limited to contract modules; observe broader wiring, tests, required aggregation, and remote activation on a real PR.                      | A local browser pack does not establish remote CI activation or broader CI delivery.                                                                                      |
| Local customizer closeout               | Keep routing closure separate from active record-sheet closure.                                                                                          | Routing is archived on main; record-sheet and browser/publication boundaries retain their own evidence.                                                                   |
| Unit comparison and wider proof backlog | Keep unit comparison explicitly planned and preserve all 40 accepted triage dispositions/current owners in the roadmap.                                  | Original partitions remain historical; residual runtime gates are not closed by structural validation.                                                                    |

The inventory reviewed 57 baseline specs against source and 160 structurally. Its original 22 needs-proof rows are historical partitions, not an undispositioned queue. All 40 finite triage rows have accepted dispositions and current owners in the roadmap; residual runtime and publication gates remain separate.

## Dependency sequence

The active graph has two related lanes that converge in the umbrella and final journey proof:

1. **Authority foundation:** [design-campaign-authority-and-sync](../../../openspec/changes/design-campaign-authority-and-sync/proposal.md) has 26 checked boxes and live subslices, but its production journal flag, host-view split, and full journey remain explicit nonclaims. [harden-gm-two-player-campaign-sessions](../../../openspec/changes/harden-gm-two-player-campaign-sessions/proposal.md) is the 83/25 program umbrella and keeps the broad acceptance contract open.
2. **CAMP evidence infrastructure:** [add-camp01-authority-receipts](../../../openspec/changes/add-camp01-authority-receipts/proposal.md) has 19/0 checked boxes, but its parent exact-main handoff is still outstanding. Its durable receipts are prerequisites for the roster and final journey packages.
3. **Saved-design product lane:** [add-saved-custom-unit-campaign-roster](../../../openspec/changes/add-saved-custom-unit-campaign-roster/proposal.md) remains 0/28 even though roster and Mech Bay slices shipped. [enable-saved-custom-unit-combat](../../../openspec/changes/enable-saved-custom-unit-combat/proposal.md) has an implementation report but remains 0/6 until its broad boxes map to receipts and exact-head integrated proof passes. [design-vault-campaign-separation-and-maps](../../../openspec/changes/design-vault-campaign-separation-and-maps/proposal.md) is 1/27: its fuzzy-template-match removal is a resolved prerequisite; version/migration, travel/opportunity, and map work remain planned.
4. **Combat history lane:** [adopt-combat-journal-cutover-and-gm-rewind](../../../openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/proposal.md) retains 0/17 unchecked original tasks, but is not wholly unstarted: `6d493d508fe797e9a4342cbc0bd41b13ff376be4` locally maps source assertions only (80 rows: 34 real, 6 strict expected failures, 40 missing), and `6f795eb515aad090186e01f373447b3bb6d7801c` is a local campaign-authority API precursor. These do not prove production combat cutover, integrated acceptance, or exact-main proof. History prefixes A `870f93856d5b09eb1ed7191be94a5a3e9e52103c`, B `22cbe105fc9b050cc136f823d4bddc5f6fb6c8fc`, and C `fd335ee371c522957544c96b1e7f62772075b504` are local verified; blocked A publication prevents B/C export. [add-cross-stream-effect-receipts](../../../openspec/changes/add-cross-stream-effect-receipts/proposal.md) remains 0/51 and is gated on exact-main predecessors. It must complete before [add-authoritative-history-branches](../../../openspec/changes/add-authoritative-history-branches/proposal.md) can complete later correction/activation work; branches are partial at 7/39.
5. **Integration closeout:** the umbrella consumes the journal, cross-stream, and branch lanes. [prove-saved-custom-unit-campaign-journey](../../../openspec/changes/prove-saved-custom-unit-campaign-journey/proposal.md) is the final 0/9 verification package and requires the receipt infrastructure, roster, and supported custom-combat boundaries.
6. **Narrow customizer lane:** routing closure is separately archived on main. Record-sheet work, browser `77d9a9480a3a47b1849f166db01278f93f3d8094`, and CI work retain separate receipts: only CI contract modules in PR #1647 are complete; broader wiring, tests, aggregation, remote activation, and the full customizer pack’s exact-main browser proof remain open.

### Archived during this reconciliation

These three moves were explicitly authorized and their original hashes were preserved. They are local archive-navigation moves in this reconciliation; they do not collectively establish an archive-on-main result. The separately merged routing archive from PR #1639 is outside this three-move set.

| Archived package                                                                                                               | Current record                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| [add-customizer-edit-recovery](../../../openspec/changes/archive/2026-09-12-add-customizer-edit-recovery/tasks.md)             | Local authorized archive move; use its own receipt for any main claim.                                       |
| [establish-battlemech-chassis-index](../../../openspec/changes/archive/2026-09-12-establish-battlemech-chassis-index/tasks.md) | Local-verified commit `f6078a2a790129bb7faa53249710b4151b779ab9`; publication and main proof remain pending. |
| [repair-equipment-catalog](../../../openspec/changes/archive/2026-09-12-repair-equipment-catalog/tasks.md)                     | Local-verified commit `0f26b709f33ecb5513058844e8077d61b5a2a3ed`; publication and main proof remain pending. |

## Canonical specification directory

Each row below is one canonical `spec.md` path. Groups are domain navigation aids, not separate authority boundaries; together they must contain every canonical name exactly once.

### 1. Core application, UI, accessibility, and operations (32)

Core application shell, navigation, accessibility, presentation tokens, desktop/mobile surfaces, and engineering/QC operations.

| Specification                                                                              | Initial triage   | Reconciliation record     |
| ------------------------------------------------------------------------------------------ | ---------------- | ------------------------- |
| [accessibility-system](../../../openspec/specs/accessibility-system/spec.md)               | unaffected       | retained                  |
| [api-layer](../../../openspec/specs/api-layer/spec.md)                                     | unaffected       | retained                  |
| [app-navigation](../../../openspec/specs/app-navigation/spec.md)                           | unaffected       | retained                  |
| [app-settings](../../../openspec/specs/app-settings/spec.md)                               | preserve-planned | retained                  |
| [auto-save-persistence](../../../openspec/specs/auto-save-persistence/spec.md)             | unaffected       | changed in reconciliation |
| [camera-controls](../../../openspec/specs/camera-controls/spec.md)                         | unaffected       | retained                  |
| [code-formatting-standards](../../../openspec/specs/code-formatting-standards/spec.md)     | unaffected       | retained                  |
| [color-system](../../../openspec/specs/color-system/spec.md)                               | unaffected       | retained                  |
| [component-configuration](../../../openspec/specs/component-configuration/spec.md)         | unaffected       | retained                  |
| [confirmation-dialogs](../../../openspec/specs/confirmation-dialogs/spec.md)               | unaffected       | retained                  |
| [desktop-experience](../../../openspec/specs/desktop-experience/spec.md)                   | unaffected       | retained                  |
| [desktop-local-services](../../../openspec/specs/desktop-local-services/spec.md)           | unaffected       | retained                  |
| [display-formatting](../../../openspec/specs/display-formatting/spec.md)                   | unaffected       | retained                  |
| [drag-and-drop-system](../../../openspec/specs/drag-and-drop-system/spec.md)               | unaffected       | retained                  |
| [flow-audit-routines](../../../openspec/specs/flow-audit-routines/spec.md)                 | unaffected       | retained                  |
| [logging-system](../../../openspec/specs/logging-system/spec.md)                           | unaffected       | retained                  |
| [maintenance-code-health](../../../openspec/specs/maintenance-code-health/spec.md)         | unaffected       | retained                  |
| [mobile-interaction-patterns](../../../openspec/specs/mobile-interaction-patterns/spec.md) | unaffected       | retained                  |
| [mobile-loadout-tray](../../../openspec/specs/mobile-loadout-tray/spec.md)                 | unaffected       | retained                  |
| [multi-unit-tabs](../../../openspec/specs/multi-unit-tabs/spec.md)                         | unaffected       | retained                  |
| [overview-basic-info](../../../openspec/specs/overview-basic-info/spec.md)                 | needs-proof      | changed in reconciliation |
| [playable-command-screens](../../../openspec/specs/playable-command-screens/spec.md)       | unaffected       | retained                  |
| [pwa-offline-system](../../../openspec/specs/pwa-offline-system/spec.md)                   | unaffected       | retained                  |
| [quick-game-ui](../../../openspec/specs/quick-game-ui/spec.md)                             | unaffected       | retained                  |
| [release-build-system](../../../openspec/specs/release-build-system/spec.md)               | update-now       | changed in reconciliation |
| [storybook-component-library](../../../openspec/specs/storybook-component-library/spec.md) | unaffected       | retained                  |
| [shutdown-startup-system](../../../openspec/specs/shutdown-startup-system/spec.md)         | unaffected       | retained                  |
| [tab-management](../../../openspec/specs/tab-management/spec.md)                           | needs-proof      | retained                  |
| [theming-appearance](../../../openspec/specs/theming-appearance/spec.md)                   | unaffected       | retained                  |
| [toast-notifications](../../../openspec/specs/toast-notifications/spec.md)                 | update-now       | changed in reconciliation |
| [ui-flow-shell](../../../openspec/specs/ui-flow-shell/spec.md)                             | unaffected       | retained                  |
| [utility-patterns](../../../openspec/specs/utility-patterns/spec.md)                       | update-now       | changed in reconciliation |

### 2. Construction, units, equipment, and record sheets (49)

Construction rules, unit families, equipment/catalog surfaces, customizer behavior, unit provenance, and rendered record sheets.

| Specification                                                                                | Initial triage   | Reconciliation record     |
| -------------------------------------------------------------------------------------------- | ---------------- | ------------------------- |
| [aerospace-deployment](../../../openspec/specs/aerospace-deployment/spec.md)                 | unaffected       | retained                  |
| [aerospace-unit-system](../../../openspec/specs/aerospace-unit-system/spec.md)               | preserve-planned | retained                  |
| [armor-diagram-variants](../../../openspec/specs/armor-diagram-variants/spec.md)             | update-now       | changed in reconciliation |
| [armor-diagram](../../../openspec/specs/armor-diagram/spec.md)                               | needs-proof      | retained                  |
| [armor-system](../../../openspec/specs/armor-system/spec.md)                                 | unaffected       | retained                  |
| [battle-armor-unit-system](../../../openspec/specs/battle-armor-unit-system/spec.md)         | update-now       | changed in reconciliation |
| [battlemech-chassis-index](../../../openspec/specs/battlemech-chassis-index/spec.md)         | new canonical    | changed in reconciliation |
| [cockpit-system](../../../openspec/specs/cockpit-system/spec.md)                             | unaffected       | retained                  |
| [construction-rules-core](../../../openspec/specs/construction-rules-core/spec.md)           | update-now       | changed in reconciliation |
| [construction-services](../../../openspec/specs/construction-services/spec.md)               | unaffected       | retained                  |
| [custom-unit-combat](../../../openspec/specs/custom-unit-combat/spec.md)                     | new canonical    | changed in reconciliation |
| [customizer-edit-recovery](../../../openspec/specs/customizer-edit-recovery/spec.md)         | new canonical    | changed in reconciliation |
| [customizer-responsive-layout](../../../openspec/specs/customizer-responsive-layout/spec.md) | update-now       | changed in reconciliation |
| [customizer-routing](../../../openspec/specs/customizer-routing/spec.md)                     | update-now       | changed in reconciliation |
| [customizer-tabs](../../../openspec/specs/customizer-tabs/spec.md)                           | update-now       | changed in reconciliation |
| [customizer-toolbar](../../../openspec/specs/customizer-toolbar/spec.md)                     | unaffected       | retained                  |
| [equipment-browser](../../../openspec/specs/equipment-browser/spec.md)                       | update-now       | changed in reconciliation |
| [equipment-database](../../../openspec/specs/equipment-database/spec.md)                     | needs-proof      | retained                  |
| [equipment-placement](../../../openspec/specs/equipment-placement/spec.md)                   | preserve-planned | retained                  |
| [equipment-services](../../../openspec/specs/equipment-services/spec.md)                     | update-now       | changed in reconciliation |
| [equipment-tray](../../../openspec/specs/equipment-tray/spec.md)                             | preserve-planned | retained                  |
| [engine-system](../../../openspec/specs/engine-system/spec.md)                               | unaffected       | retained                  |
| [ferro-lamellor-armor-combat](../../../openspec/specs/ferro-lamellor-armor-combat/spec.md)   | unaffected       | retained                  |
| [gyro-system](../../../openspec/specs/gyro-system/spec.md)                                   | unaffected       | retained                  |
| [hardpoint-system](../../../openspec/specs/hardpoint-system/spec.md)                         | unaffected       | retained                  |
| [heat-sink-system](../../../openspec/specs/heat-sink-system/spec.md)                         | unaffected       | retained                  |
| [infantry-unit-system](../../../openspec/specs/infantry-unit-system/spec.md)                 | preserve-planned | retained                  |
| [internal-structure-system](../../../openspec/specs/internal-structure-system/spec.md)       | unaffected       | retained                  |
| [mech-configuration-system](../../../openspec/specs/mech-configuration-system/spec.md)       | unaffected       | retained                  |
| [mm-data-asset-integration](../../../openspec/specs/mm-data-asset-integration/spec.md)       | preserve-planned | retained                  |
| [omnimech-system](../../../openspec/specs/omnimech-system/spec.md)                           | unaffected       | retained                  |
| [protomech-unit-system](../../../openspec/specs/protomech-unit-system/spec.md)               | preserve-planned | retained                  |
| [record-sheet-export](../../../openspec/specs/record-sheet-export/spec.md)                   | update-now       | changed in reconciliation |
| [superheavy-mech-system](../../../openspec/specs/superheavy-mech-system/spec.md)             | preserve-planned | retained                  |
| [tech-base-integration](../../../openspec/specs/tech-base-integration/spec.md)               | unaffected       | retained                  |
| [tech-base-rules-matrix](../../../openspec/specs/tech-base-rules-matrix/spec.md)             | unaffected       | retained                  |
| [tech-base-variants-reference](../../../openspec/specs/tech-base-variants-reference/spec.md) | unaffected       | retained                  |
| [tech-rating-system](../../../openspec/specs/tech-rating-system/spec.md)                     | unaffected       | retained                  |
| [unit-comparison](../../../openspec/specs/unit-comparison/spec.md)                           | needs-proof      | changed in reconciliation |
| [unit-entity-model](../../../openspec/specs/unit-entity-model/spec.md)                       | unaffected       | retained                  |
| [unit-info-banner](../../../openspec/specs/unit-info-banner/spec.md)                         | unaffected       | retained                  |
| [unit-services](../../../openspec/specs/unit-services/spec.md)                               | update-now       | changed in reconciliation |
| [unit-sharing](../../../openspec/specs/unit-sharing/spec.md)                                 | unaffected       | retained                  |
| [unit-sprite-system](../../../openspec/specs/unit-sprite-system/spec.md)                     | preserve-planned | retained                  |
| [unit-store-architecture](../../../openspec/specs/unit-store-architecture/spec.md)           | unaffected       | retained                  |
| [unit-validation-framework](../../../openspec/specs/unit-validation-framework/spec.md)       | needs-proof      | retained                  |
| [unit-versioning](../../../openspec/specs/unit-versioning/spec.md)                           | unaffected       | retained                  |
| [vehicle-unit-system](../../../openspec/specs/vehicle-unit-system/spec.md)                   | update-now       | changed in reconciliation |
| [weight-class-system](../../../openspec/specs/weight-class-system/spec.md)                   | unaffected       | retained                  |

### 3. Campaign and strategic layer (35)

Campaign lifecycle, roster/personnel, contracts, finance, repair, progression, travel, and campaign-facing UI.

| Specification                                                                                      | Initial triage   | Reconciliation record     |
| -------------------------------------------------------------------------------------------------- | ---------------- | ------------------------- |
| [after-combat-report](../../../openspec/specs/after-combat-report/spec.md)                         | unaffected       | retained                  |
| [awards](../../../openspec/specs/awards/spec.md)                                                   | unaffected       | retained                  |
| [campaign-bay-ui](../../../openspec/specs/campaign-bay-ui/spec.md)                                 | preserve-planned | retained                  |
| [campaign-combat-loop](../../../openspec/specs/campaign-combat-loop/spec.md)                       | needs-proof      | changed in reconciliation |
| [campaign-command-ui](../../../openspec/specs/campaign-command-ui/spec.md)                         | unaffected       | retained                  |
| [campaign-fast-forward-api](../../../openspec/specs/campaign-fast-forward-api/spec.md)             | unaffected       | retained                  |
| [campaign-finances](../../../openspec/specs/campaign-finances/spec.md)                             | unaffected       | retained                  |
| [campaign-hud](../../../openspec/specs/campaign-hud/spec.md)                                       | preserve-planned | retained                  |
| [campaign-instances](../../../openspec/specs/campaign-instances/spec.md)                           | unaffected       | retained                  |
| [campaign-management](../../../openspec/specs/campaign-management/spec.md)                         | unaffected       | retained                  |
| [campaign-persistence](../../../openspec/specs/campaign-persistence/spec.md)                       | preserve-planned | retained                  |
| [campaign-personnel-architecture](../../../openspec/specs/campaign-personnel-architecture/spec.md) | needs-proof      | changed in reconciliation |
| [campaign-presets](../../../openspec/specs/campaign-presets/spec.md)                               | unaffected       | retained                  |
| [campaign-refit-and-prestige](../../../openspec/specs/campaign-refit-and-prestige/spec.md)         | unaffected       | retained                  |
| [campaign-system](../../../openspec/specs/campaign-system/spec.md)                                 | unaffected       | retained                  |
| [campaign-ui](../../../openspec/specs/campaign-ui/spec.md)                                         | unaffected       | retained                  |
| [campaign-unit-combat-state](../../../openspec/specs/campaign-unit-combat-state/spec.md)           | preserve-planned | retained                  |
| [contacts-system](../../../openspec/specs/contacts-system/spec.md)                                 | unaffected       | retained                  |
| [contract-types](../../../openspec/specs/contract-types/spec.md)                                   | unaffected       | retained                  |
| [day-progression](../../../openspec/specs/day-progression/spec.md)                                 | unaffected       | retained                  |
| [faction-standing](../../../openspec/specs/faction-standing/spec.md)                               | unaffected       | retained                  |
| [financial-management](../../../openspec/specs/financial-management/spec.md)                       | unaffected       | retained                  |
| [markets-system](../../../openspec/specs/markets-system/spec.md)                                   | unaffected       | retained                  |
| [medical-system](../../../openspec/specs/medical-system/spec.md)                                   | unaffected       | retained                  |
| [mission-contracts](../../../openspec/specs/mission-contracts/spec.md)                             | update-now       | changed in reconciliation |
| [personnel-management](../../../openspec/specs/personnel-management/spec.md)                       | needs-proof      | changed in reconciliation |
| [personnel-progression](../../../openspec/specs/personnel-progression/spec.md)                     | unaffected       | retained                  |
| [personnel-status-roles](../../../openspec/specs/personnel-status-roles/spec.md)                   | unaffected       | retained                  |
| [pilot-system](../../../openspec/specs/pilot-system/spec.md)                                       | unaffected       | retained                  |
| [random-events](../../../openspec/specs/random-events/spec.md)                                     | unaffected       | retained                  |
| [repair-maintenance](../../../openspec/specs/repair-maintenance/spec.md)                           | unaffected       | retained                  |
| [repair](../../../openspec/specs/repair/spec.md)                                                   | needs-proof      | changed in reconciliation |
| [starmap-interface](../../../openspec/specs/starmap-interface/spec.md)                             | unaffected       | retained                  |
| [time-cascade-system](../../../openspec/specs/time-cascade-system/spec.md)                         | unaffected       | retained                  |
| [turnover-retention](../../../openspec/specs/turnover-retention/spec.md)                           | unaffected       | retained                  |

### 4. Multiplayer, authority, identity, and synchronization (19)

Server authority, identity and grants, multiplayer transport, GM boundaries, event history, and synchronized session state.

| Specification                                                                                              | Initial triage   | Reconciliation record     |
| ---------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------- |
| [audit-timeline](../../../openspec/specs/audit-timeline/spec.md)                                           | unaffected       | retained                  |
| [coop-campaign-sync](../../../openspec/specs/coop-campaign-sync/spec.md)                                   | unaffected       | retained                  |
| [event-store](../../../openspec/specs/event-store/spec.md)                                                 | preserve-planned | retained                  |
| [game-session-management](../../../openspec/specs/game-session-management/spec.md)                         | needs-proof      | changed in reconciliation |
| [gm-authority-redaction](../../../openspec/specs/gm-authority-redaction/spec.md)                           | unaffected       | retained                  |
| [gm-campaign-intervention-boundaries](../../../openspec/specs/gm-campaign-intervention-boundaries/spec.md) | unaffected       | retained                  |
| [gm-cascade-preview](../../../openspec/specs/gm-cascade-preview/spec.md)                                   | unaffected       | retained                  |
| [gm-combat-interventions](../../../openspec/specs/gm-combat-interventions/spec.md)                         | unaffected       | retained                  |
| [gm-tactical-command-surface](../../../openspec/specs/gm-tactical-command-surface/spec.md)                 | unaffected       | retained                  |
| [gm-unit-reload-reconciliation](../../../openspec/specs/gm-unit-reload-reconciliation/spec.md)             | unaffected       | retained                  |
| [intervention-ledger-abstraction](../../../openspec/specs/intervention-ledger-abstraction/spec.md)         | unaffected       | retained                  |
| [multiplayer-game-surface](../../../openspec/specs/multiplayer-game-surface/spec.md)                       | unaffected       | retained                  |
| [multiplayer-matchmaking](../../../openspec/specs/multiplayer-matchmaking/spec.md)                         | unaffected       | retained                  |
| [multiplayer-server](../../../openspec/specs/multiplayer-server/spec.md)                                   | unaffected       | retained                  |
| [multiplayer-sync](../../../openspec/specs/multiplayer-sync/spec.md)                                       | unaffected       | retained                  |
| [p2p-sync-system](../../../openspec/specs/p2p-sync-system/spec.md)                                         | preserve-planned | retained                  |
| [player-identity](../../../openspec/specs/player-identity/spec.md)                                         | unaffected       | retained                  |
| [quick-session](../../../openspec/specs/quick-session/spec.md)                                             | unaffected       | retained                  |
| [user-identity](../../../openspec/specs/user-identity/spec.md)                                             | needs-proof      | changed in reconciliation |

### 5. Combat rules and tactical resolution (46)

Combat mechanics, attacks, damage, heat, movement, targeting, visibility, tactical map, and weapon resolution.

| Specification                                                                                    | Initial triage   | Reconciliation record     |
| ------------------------------------------------------------------------------------------------ | ---------------- | ------------------------- |
| [ammo-explosion-system](../../../openspec/specs/ammo-explosion-system/spec.md)                   | unaffected       | retained                  |
| [ammo-tracking](../../../openspec/specs/ammo-tracking/spec.md)                                   | unaffected       | retained                  |
| [ammunition-system](../../../openspec/specs/ammunition-system/spec.md)                           | unaffected       | retained                  |
| [attack-effects-system](../../../openspec/specs/attack-effects-system/spec.md)                   | unaffected       | retained                  |
| [battle-armor-combat](../../../openspec/specs/battle-armor-combat/spec.md)                       | unaffected       | retained                  |
| [battle-value-system](../../../openspec/specs/battle-value-system/spec.md)                       | unaffected       | retained                  |
| [c3-network-targeting](../../../openspec/specs/c3-network-targeting/spec.md)                     | needs-proof      | changed in reconciliation |
| [combat-analytics](../../../openspec/specs/combat-analytics/spec.md)                             | needs-proof      | changed in reconciliation |
| [combat-catalog-rules-parity](../../../openspec/specs/combat-catalog-rules-parity/spec.md)       | unaffected       | retained                  |
| [combat-morale-and-withdrawal](../../../openspec/specs/combat-morale-and-withdrawal/spec.md)     | unaffected       | retained                  |
| [combat-resolution](../../../openspec/specs/combat-resolution/spec.md)                           | unaffected       | retained                  |
| [critical-hit-resolution](../../../openspec/specs/critical-hit-resolution/spec.md)               | unaffected       | retained                  |
| [critical-hit-system](../../../openspec/specs/critical-hit-system/spec.md)                       | unaffected       | retained                  |
| [critical-slot-allocation](../../../openspec/specs/critical-slot-allocation/spec.md)             | needs-proof      | retained                  |
| [critical-slots-display](../../../openspec/specs/critical-slots-display/spec.md)                 | needs-proof      | retained                  |
| [damage-system](../../../openspec/specs/damage-system/spec.md)                                   | unaffected       | retained                  |
| [ecm-electronic-warfare](../../../openspec/specs/ecm-electronic-warfare/spec.md)                 | unaffected       | retained                  |
| [electronics-system](../../../openspec/specs/electronics-system/spec.md)                         | unaffected       | retained                  |
| [environmental-combat-modifiers](../../../openspec/specs/environmental-combat-modifiers/spec.md) | unaffected       | retained                  |
| [fall-mechanics](../../../openspec/specs/fall-mechanics/spec.md)                                 | unaffected       | retained                  |
| [firing-arc-calculation](../../../openspec/specs/firing-arc-calculation/spec.md)                 | needs-proof      | changed in reconciliation |
| [fog-of-war](../../../openspec/specs/fog-of-war/spec.md)                                         | unaffected       | retained                  |
| [heat-management-system](../../../openspec/specs/heat-management-system/spec.md)                 | unaffected       | retained                  |
| [heat-overflow-effects](../../../openspec/specs/heat-overflow-effects/spec.md)                   | unaffected       | retained                  |
| [hardened-armor-combat](../../../openspec/specs/hardened-armor-combat/spec.md)                   | unaffected       | retained                  |
| [hex-coordinate-system](../../../openspec/specs/hex-coordinate-system/spec.md)                   | unaffected       | retained                  |
| [hull-down-position](../../../openspec/specs/hull-down-position/spec.md)                         | needs-proof      | changed in reconciliation |
| [indirect-fire-system](../../../openspec/specs/indirect-fire-system/spec.md)                     | unaffected       | retained                  |
| [line-of-sight-visualization](../../../openspec/specs/line-of-sight-visualization/spec.md)       | unaffected       | retained                  |
| [megamek-board-parser](../../../openspec/specs/megamek-board-parser/spec.md)                     | unaffected       | retained                  |
| [movement-system](../../../openspec/specs/movement-system/spec.md)                               | unaffected       | retained                  |
| [physical-attack-system](../../../openspec/specs/physical-attack-system/spec.md)                 | unaffected       | retained                  |
| [physical-properties-system](../../../openspec/specs/physical-properties-system/spec.md)         | unaffected       | retained                  |
| [physical-weapons-system](../../../openspec/specs/physical-weapons-system/spec.md)               | unaffected       | retained                  |
| [piloting-skill-rolls](../../../openspec/specs/piloting-skill-rolls/spec.md)                     | needs-proof      | changed in reconciliation |
| [quirk-combat-integration](../../../openspec/specs/quirk-combat-integration/spec.md)             | unaffected       | retained                  |
| [secondary-target-tracking](../../../openspec/specs/secondary-target-tracking/spec.md)           | unaffected       | retained                  |
| [spa-combat-integration](../../../openspec/specs/spa-combat-integration/spec.md)                 | unaffected       | retained                  |
| [spa-ui](../../../openspec/specs/spa-ui/spec.md)                                                 | unaffected       | retained                  |
| [spatial-combat-system](../../../openspec/specs/spatial-combat-system/spec.md)                   | unaffected       | retained                  |
| [tactical-attack-intent](../../../openspec/specs/tactical-attack-intent/spec.md)                 | unaffected       | retained                  |
| [tactical-map-interface](../../../openspec/specs/tactical-map-interface/spec.md)                 | preserve-planned | retained                  |
| [tactical-movement-intent](../../../openspec/specs/tactical-movement-intent/spec.md)             | unaffected       | retained                  |
| [to-hit-resolution](../../../openspec/specs/to-hit-resolution/spec.md)                           | unaffected       | retained                  |
| [weapon-resolution-system](../../../openspec/specs/weapon-resolution-system/spec.md)             | unaffected       | retained                  |
| [weapon-system](../../../openspec/specs/weapon-system/spec.md)                                   | unaffected       | retained                  |

### 6. Gameplay engine, rules, and replay (8)

Deterministic engine orchestration, events/state, dice and rules levels, gameplay direction, skills, sessions, and replay.

| Specification                                                                          | Initial triage | Reconciliation record |
| -------------------------------------------------------------------------------------- | -------------- | --------------------- |
| [dice-system](../../../openspec/specs/dice-system/spec.md)                             | unaffected     | retained              |
| [game-engine-orchestration](../../../openspec/specs/game-engine-orchestration/spec.md) | unaffected     | retained              |
| [game-event-system](../../../openspec/specs/game-event-system/spec.md)                 | unaffected     | retained              |
| [game-state-management](../../../openspec/specs/game-state-management/spec.md)         | unaffected     | retained              |
| [gameplay-roadmap](../../../openspec/specs/gameplay-roadmap/spec.md)                   | unaffected     | retained              |
| [replay-library](../../../openspec/specs/replay-library/spec.md)                       | unaffected     | retained              |
| [rules-level-system](../../../openspec/specs/rules-level-system/spec.md)               | unaffected     | retained              |
| [skills-system](../../../openspec/specs/skills-system/spec.md)                         | unaffected     | retained              |

### 7. Data, validation, and persistence (16)

Canonical data intake, schemas, formula and parity checks, persistence boundaries, validation contracts, and vault synchronization.

| Specification                                                                          | Initial triage | Reconciliation record     |
| -------------------------------------------------------------------------------------- | -------------- | ------------------------- |
| [acquisition-supply-chain](../../../openspec/specs/acquisition-supply-chain/spec.md)   | unaffected     | retained                  |
| [bv-validation-tooling](../../../openspec/specs/bv-validation-tooling/spec.md)         | needs-proof    | changed in reconciliation |
| [compendium-browser](../../../openspec/specs/compendium-browser/spec.md)               | update-now     | changed in reconciliation |
| [core-entity-types](../../../openspec/specs/core-entity-types/spec.md)                 | unaffected     | retained                  |
| [core-enumerations](../../../openspec/specs/core-enumerations/spec.md)                 | unaffected     | retained                  |
| [data-integrity-validation](../../../openspec/specs/data-integrity-validation/spec.md) | unaffected     | retained                  |
| [data-loading-architecture](../../../openspec/specs/data-loading-architecture/spec.md) | update-now     | changed in reconciliation |
| [database-schema](../../../openspec/specs/database-schema/spec.md)                     | update-now     | changed in reconciliation |
| [era-temporal-system](../../../openspec/specs/era-temporal-system/spec.md)             | unaffected     | retained                  |
| [formula-registry](../../../openspec/specs/formula-registry/spec.md)                   | unaffected     | retained                  |
| [mtf-parity-validation](../../../openspec/specs/mtf-parity-validation/spec.md)         | unaffected     | retained                  |
| [persistence-services](../../../openspec/specs/persistence-services/spec.md)           | update-now     | changed in reconciliation |
| [serialization-formats](../../../openspec/specs/serialization-formats/spec.md)         | unaffected     | retained                  |
| [validation-patterns](../../../openspec/specs/validation-patterns/spec.md)             | unaffected     | retained                  |
| [validation-rules-master](../../../openspec/specs/validation-rules-master/spec.md)     | unaffected     | retained                  |
| [vault-sync](../../../openspec/specs/vault-sync/spec.md)                               | needs-proof    | changed in reconciliation |

### 8. Scenario, force, terrain, and simulation (15)

Scenario generation and objectives, force composition, terrain, seeded simulation, and durable journey/E2E quality evidence.

| Specification                                                                | Initial triage   | Reconciliation record     |
| ---------------------------------------------------------------------------- | ---------------- | ------------------------- |
| [balanced-grid](../../../openspec/specs/balanced-grid/spec.md)               | unaffected       | retained                  |
| [e2e-testing](../../../openspec/specs/e2e-testing/spec.md)                   | unaffected       | changed in reconciliation |
| [encounter-system](../../../openspec/specs/encounter-system/spec.md)         | unaffected       | retained                  |
| [force-generator](../../../openspec/specs/force-generator/spec.md)           | unaffected       | retained                  |
| [force-hierarchy](../../../openspec/specs/force-hierarchy/spec.md)           | unaffected       | retained                  |
| [force-management](../../../openspec/specs/force-management/spec.md)         | needs-proof      | changed in reconciliation |
| [journey-qc](../../../openspec/specs/journey-qc/spec.md)                     | unaffected       | retained                  |
| [scenario-generation](../../../openspec/specs/scenario-generation/spec.md)   | unaffected       | retained                  |
| [scenario-objectives](../../../openspec/specs/scenario-objectives/spec.md)   | unaffected       | retained                  |
| [scenario-packs](../../../openspec/specs/scenario-packs/spec.md)             | unaffected       | retained                  |
| [simulation-detectors](../../../openspec/specs/simulation-detectors/spec.md) | unaffected       | retained                  |
| [simulation-system](../../../openspec/specs/simulation-system/spec.md)       | unaffected       | retained                  |
| [terrain-generation](../../../openspec/specs/terrain-generation/spec.md)     | preserve-planned | retained                  |
| [terrain-rendering](../../../openspec/specs/terrain-rendering/spec.md)       | unaffected       | retained                  |
| [terrain-system](../../../openspec/specs/terrain-system/spec.md)             | preserve-planned | retained                  |

## Evidence limits

The inventory preserves old receipts and points to detailed package reports, but current acceptance still requires fresh evidence at the relevant boundary. Campaign authority (26/0) has scoped nonclaims, CAMP receipts (19/0) await the parent handoff, saved combat (0/6) has an implementation report without checked ledger completion, roster (0/28) has shipped slices without the full authority journey, and journey (0/9) is verification work. Cross-stream receipts retain 0/51 original open tasks and are gated on predecessors. Combat journal tasks remain 0/17, while local source-inventory and campaign-authority API precursor receipts remain short of production cutover, integrated acceptance, publication, and exact-main proof. The GM umbrella remains partial at 83/25. Do not infer broad live verification from canonical presence, source paths, screenshots, old focused test counts, local commits, or an implementation report.
