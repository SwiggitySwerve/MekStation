Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met. No partial domain schema pack may be wired to production replay, recovery, or authority.

Work-path trace: this leaf owns the replay/upcast/checkpoint/quarantine portions of umbrella sections 12 and 15, implements `Checkpoints and Compaction Are Cache-Only` and `Corrupt Authority Data Is Quarantined Per Session`, and is the strict predecessor of `add-authority-audit-and-privacy-proof`. `schema-pack-inventory.md` is the declarative owner map for all seven campaign and 80 combat discriminants.

## 0. Foundation Admission — Posthumous Receipt

- [x] 0.1 Record the fail-closed predecessor admission receipt required by wave-map rule 8: verify both `establish-entity-event-journal-contract` and `harden-sqlite-journal-coherent-verified-open` are archived on exact main, absent from the active ledger, and have no surviving branch/worktree before any replay-safety PR.
  - Receipt (recorded posthumously 2026-08-01): `openspec/changes/archive/2026-07-31-establish-entity-event-journal-contract/` and `openspec/changes/archive/2026-08-01-harden-sqlite-journal-coherent-verified-open/` both exist on exact main `a215ce1038018f28eb9cad41a547f54d18edd0aa`; neither change appears in `openspec/active-change-ledger.json`; no local or remote branch or registered worktree for either predecessor remains. Replay-safety PRs S/S2/1A merged after these conditions held.

## S. Replay-Safety Wave Decomposition — Spec-Only PR

- [x] S.1 Inventory the live persistence and replay boundaries: 80 combat discriminants, seven campaign discriminants, versionless legacy envelopes, generic journal `payload: unknown`, and implicit skip/no-op projector paths; persist the exact one-pack-per-discriminant assignment in `schema-pack-inventory.md`.
- [x] S.2 Replace the oversized three-PR plan with the capped registry, legacy-adapter, domain-schema, determinism, projector, checkpoint, quarantine, integration, UI, and closeout seams below; strengthen the delta requirements so placeholder validators and implicit legacy versions cannot satisfy payload locking.
- [x] S.3 Run strict OpenSpec/QC validation, diff/size checks, and one sequential independent architecture/consistency review; keep this PR declarative only.
  - Receipt: Node 22 strict OpenSpec passed 230/230, OpenSpec QC accounted for 13/13 active changes with zero errors, the checked-in inventory matched 80 combat plus seven campaign discriminants with no missing/extra/duplicate owner, `git diff --check` passed, and the sequential independent verifier approved the seven-artifact declarative diff with no P0-P3 findings.
- [x] S.4 After merge, verify the exact-main artifacts and prune the spec branch/worktree before PR 1 implementation.
  - Receipt: PR #1120 merged head `d7ae5216b45f98b5b15540d982464399108c74d7` as `c0a3b0e6a0e876d3732358567089f2cf20dd1bba` with 29 successful checks. Fresh Node 22 verification on descendant exact main `9c424d108d242db91de4d91a356a4692d0d6c004` passed strict OpenSpec 228/228, accounted for 11/11 active changes with zero QC errors, and found no local or remote `codex/split-replay-schema-safety-waves` ref or registered worktree before the clean PR 1 branch was created.

## S2. Registry/Fingerprint Cap Split — Spec-Only PR

- [x] S2.1 Record the formatted registry/upcaster/fingerprint red-green spike above the 500-line PR ceiling, discard product edits from this branch, and preserve them only as a local recovery stash outside the branch diff.
- [x] S2.2 Split the former PR 1 into the independently reviewable registry/upcaster kernel (PR 1A) and history-prefix pipeline fingerprint (PR 1B); neither PR may introduce real campaign/combat registrations or production wiring.
- [x] S2.3 Run strict OpenSpec/QC, purpose/terminology, diff/size checks, and sequential independent consistency review on this declarative-only split.
  - Receipt: the formatted three-file spike was 541 lines before task receipts, so its product edits were stashed after a focused 10/10 green test run. Node 22 strict OpenSpec passed 228/228, QC accounted for 11/11 active changes, purpose lint passed 217 files, terminology passed 306 files, `git diff --check` passed, and the sequential independent reviewer approved the two-file declarative diff with no P0-P3 findings.

Post-merge terminal evidence: before PR 1A implementation resumes, verify these artifacts on exact main, remove this spec worktree/branch, prune refs, and record the receipt in task 1A.0.

## 1A. Schema Registry and Upcaster Kernel — PR 1A

- [x] 1A.0 Record the merged S2 spec PR, exact-main OpenSpec/QC receipt, and pruned S2 branch/worktree before restoring the kernel spike onto a fresh PR 1A branch.
  - Receipt: PR #1124 merged head `4f58107b70bd8e3178d6088104e1e9873973a410` as `551885b10a13da429c85cb785b22ec9f9bac7b22` with 29 successful checks; exact-main OpenSpec passed 228/228, QC accounted for 11/11 active changes, purpose/terminology passed 217/306 files, and the S2 branch/worktree were pruned before this clean PR 1A branch was created.
- [x] 1A.1 Add an adapter-neutral registry for immutable event registrations with explicit current targets, strict synthetic payload schemas, and pure one-version-at-a-time upcasters; keep all real domain types unsupported.
- [x] 1A.2 Reject duplicate/conflicting registrations and missing/ambiguous transition paths with typed failures.
- [x] 1A.3 Prove synthetic fixtures upcast deterministically without mutating input objects or stored payload bytes.
- [x] 1A.4 Run focused tests, Node 22 typecheck/lint/format, strict OpenSpec/QC, and sequential independent review.
  - Receipt: focused replay tests passed 15/15; Node 22 typecheck and full lint passed with zero errors (71 existing warnings), targeted oxfmt/oxlint passed with zero findings, strict OpenSpec passed 228/228, QC accounted for 11/11 active changes, purpose/terminology passed 217/306 files, and five sequential reviews approved after the line-cap, coverage, and type-safety findings were fixed; repository-wide format-check remains baseline-limited by four unrelated exact-main files.
- [x] 1A.5 After merge, rerun the registry/upcaster receipt on exact main and prune the merged branch/worktree before PR 1B.
  - Receipt: PR #1125 merged head `e3f9d471b19eab8a0a8a437a6de9dd498d80e713` as `a215ce1038018f28eb9cad41a547f54d18edd0aa` with 29/29 successful checks; clean exact main passed registry tests 15/15, Node 22 typecheck, strict OpenSpec 228/228, and QC 11/11 before the PR 1A branch/worktree were removed and refs pruned.

## 1B. Required-History Pipeline Fingerprint — PR 1B

- [x] 1B.0 Do not begin until task 1A.5 has an exact-main merge and prune receipt.
- [x] 1B.1 Fingerprint the canonical ordered target-schema and transition identities actually required by a history prefix, without adding a projector or production replay integration.
- [x] 1B.2 Prove registration/history order does not change the fingerprint, duplicate required identities are collapsed, unused registrations do not participate, and a required target/transition identity change does change the fingerprint.
  - Receipt: required-path SHA-256 fingerprint implemented with the journal canonicalizer; focused replay suites pass 22/22 across empty, isolated order/duplicate, unused-schema/registration/transition, required-identity, and typed fail-closed cases; Node 22 typecheck and full lint pass with zero errors (71 existing warnings), targeted lint/format pass, strict OpenSpec passes 228/228, OpenSpec QC accounts for 11/11 active changes with zero errors, and three sequential independent reviews approve; repository-wide format remains baseline-limited by four unrelated exact-main files.
- [x] 1B.3 Run focused tests, Node 22 typecheck/lint/format, strict OpenSpec/QC, and sequential independent review.
- [x] 1B.4 After merge, rerun the fingerprint receipt on exact main and prune before PR 2.
  - Receipt (2026-08-20): PR 1B merged as #1127 (`c938641bd`). On exact main `f653187d4` the fingerprint + registry suites pass 22/22 under Node 22; no local or remote branch or registered worktree containing "replay" or "fingerprint" survives.

## 2. Explicit Legacy Source Adapters — PR 2

- [x] 2.1 Inventory and name the currently readable versionless combat NDJSON/IndexedDB and campaign-sync envelope formats, including stable format IDs and format versions.
  - Receipt: `LEGACY_SOURCE_FORMATS` in `src/lib/events/replay/ReplayLegacySourceAdapters.ts` names `simulation-report-jsonl@1` (byte-backed `simulation-reports/<source>/<gameId>.jsonl` lines), `match-log-idb@2` (object-backed `mekstation-match-log` IndexedDB `matchEvents` records at `MATCH_LOG_DB_VERSION` 2), and `campaign-sync-envelope@1` (object-backed co-op transport `ICampaignEvent` envelopes); a suite row pins the exact inventory.
- [x] 2.2 Before normalization, bind an NDJSON event to its exact raw line bytes and bind an IndexedDB/object record to an immutable snapshot using the journal's versioned canonical JSON encoding; hash that pre-normalization evidence, retain source identity, and continue requiring explicit `eventVersion` for journal envelopes.
  - Receipt: `bindLegacyByteEvent` digests a private copy of the exact raw line bytes before parsing; `bindLegacyObjectEvent` snapshots via `canonicalizeJsonV1` and digests the snapshot bytes; both return frozen attributions carrying format id/version/binding/digest/byte-length (object-backed also the canonical snapshot); `requireJournalEventVersion` keeps journal envelopes on explicit versions.
- [x] 2.3 Reject unknown format/version, ambiguous attribution, and a generic missing-version fallback with typed unsupported-history evidence.
  - Receipt: typed `LegacySourceAttributionError` carries code + source identity for `unknown-source-format`, `unknown-format-version`, `binding-mismatch`, `ambiguous-attribution` (record already naming eventVersion/schemaVersion), `invalid-source-event`, and `missing-event-version`; each code has a kill row.
- [x] 2.4 Prove byte-backed and object-backed source mutation cannot change or detach the captured evidence/digest, then run adapter fixtures, Node 22 typecheck/lint/format, strict OpenSpec/QC, and sequential independent compatibility review.
  - Receipt: mutation rows fill the caller's byte buffer and rewrite the source record after binding — digest, canonical snapshot, and frozen payload all hold; key-order canonical-stability row included. Adapter suite 10/10; replay family 32/32; Node 22 tsc/oxlint/oxfmt clean; strict OpenSpec + QC green (receipts below); compatibility review = the PR review gate.
- [x] 2.5 After merge, rerun the legacy-attribution receipt on exact main and prune before PR 3.
  - Receipt (2026-08-20): PR 2 merged as #1257 (`34ec83153` -> `63c0bb4bd`, 29 checks green). On exact main `63c0bb4bd` the adapter suite passes 10/10 under Node 22; the `feat/replay-legacy-source-adapters` local and remote branches are pruned before the PR 3 branch.

## 3. Campaign Baseline Schema Pack — PR 3

- [x] 3.1 Add strict concrete v1 payload schemas for all seven `CampaignEventType` variants, reusing concrete nested campaign schemas where their shapes are identical.
  - Receipt: `src/lib/events/replay/CampaignBaselineSchemaPack.ts` defines `.strict()` zod v1 schemas for all seven payloads; the nested roster-unit, pilot, contract, and whole-authoritative-state shapes are shared schema constants reused across `PilotHired`, `ContractAccepted`, `RosterUnitChanged`, `SalvageAllocated`, and `CampaignSnapshotPublished`.
- [x] 3.2 Register every campaign variant at baseline v1 and prove the registry discriminants exactly equal the canonical campaign event union.
  - Receipt: `CAMPAIGN_BASELINE_SCHEMA_PACK` registers each variant at `targetSchemaVersion` 1 with no transitions; the pack record `satisfies Record<CampaignEventType, z.ZodType>` makes the union equality a compile-time fact in both directions, and a suite row proves the runtime discriminant set equals the frozen task/PR-3 inventory row.
- [x] 3.3 Add one valid fixture and a missing/extra/ill-typed mutation matrix per variant, including nested roster, pilot, contract, salvage, and whole-snapshot payloads.
  - Receipt: `__fixtures__/CampaignBaselineSchemaPack.fixture.ts` holds one populated valid payload per variant; the suite runs a 3-mutation matrix per variant (21 mutants) with nested targets on purpose — pilot.name missing, contract extra key, unit.status out-of-enum, recoveredUnit ill-typed, snapshot.state.salvagePool missing, snapshot extra key, and a nested rosterUnits record value ill-typed — every mutant failing typed `invalid-payload`.
- [x] 3.4 Run focused campaign schema/reducer fixtures, Node 22 typecheck/lint/format, strict OpenSpec/QC, and sequential independent schema review; do not wire campaign authority or recovery.
  - Receipt: pack suite 17/17 (union equality, 7 valid round-trips with deterministic frozen payloads, 21-mutant matrix, unknown-discriminant/version fail-closed, order-independent pipeline fingerprint); Node 22 tsc/oxlint/oxfmt clean; strict OpenSpec + QC green; nothing wired to campaign authority or recovery (pack exports only); schema review = the PR review gate.
- [ ] 3.5 After merge, rerun the campaign schema receipt on exact main and prune before PR 4.

## 4. Combat Lifecycle and Initiative Baseline Pack — PR 4

- [x] 4.1 Add strict concrete v1 schemas for game creation/start/end, turn/phase boundaries, and initiative roll/order payloads.
  - Receipt (2026-08-21): `CombatLifecycleBaselineSchemaPack.ts` registers the eight inventory discriminants at baseline v1 (keyed by the RUNTIME `GameEventType` values, `combat.<type>.v1` schema ids, no transitions), with a local eight-member union `satisfies` clause for compile-time exhaustiveness (whole-union composition stays task 11). `CombatLifecycleSharedSchemas.ts` carries the strict nested mirrors `IGameCreatedPayload` embeds — `IGameConfig` (+ environmental conditions), the full ~90-field `IGameUnit` including all five per-type init blocks (aerospace, complete `IInfantry` closure through `ISquadUnit`/`IBaseUnit`/core entity interfaces, proto, battle-armor, vehicle + critical-availability profile), `IHexTerrain`/`ITerrainFeature`, the C3 network chain, `IEncounterMeta`, `IObjectiveMarker`, ground objects, and minefields. Every object `.strict()`; enums via `z.nativeEnum` or exact-member `z.enum` literals; concrete typed maps only.
- [x] 4.2 Register the pack without composing it into production replay and add per-variant valid plus missing/extra/ill-typed fixtures.
  - Receipt (2026-08-21): pack referenced ONLY by its own contract test (grep proof — zero composition sites). Fixture file carries a valid payload per variant; the `game_created` fixture deliberately exercises the deep surface (fully-optioned mech seed, vehicleInit, complete infantryInit record, terrain, authored C3 net, encounter meta, objectives, ground objects, minefields). Mutation matrix: 3 per variant (missing/extra/ill-typed), several targeting nested shapes (infantry `platoonStrength` deletion, vehicleInit extra key, minefield ill-typed damage) — all 24 rejected with `invalid-payload`; unknown discriminant + unknown version fail closed. 20/20 contract tests green.
- [x] 4.3 Prove resolved setup/initiative inputs are retained and no current catalog, clock, or RNG lookup is needed to validate the pack.
  - Receipt (2026-08-21): retention pinned by test — the `initiative_rolled` audit trail (consumed `rolls` array, raw + original 2d6, modifiers, totals, Tactical Genius side) survives validation byte-for-byte. Purity pinned by test — the pack module graph's RUNTIME imports are asserted to be only `zod`, pure `@/types/...` enum modules, and replay-local relative modules (`import type` lines exempt as erased); no catalog, clock, store, service, or RNG import can enter without failing the contract test.
- [x] 4.4 Run focused lifecycle tests, Node 22 typecheck/lint/format, strict OpenSpec/QC, and sequential independent schema review.
  - Receipt (2026-08-21): pack contract 20/20 + sibling replay suites (registry, campaign pack, legacy adapters, fingerprint) 49/49 on Node 22; typecheck/lint/format clean; `openspec validate add-replay-schema-and-checkpoint-safety --strict` green. Independent review: a fresh-context reviewer agent walked every schema against its canonical interface field-by-field; findings were fixed and the review verdict recorded in the PR description.
- [x] 4.5 After merge, rerun exact main and prune before PR 5.
  - Receipt (2026-08-21): PR 4 merged as #1279 (squash, SHA-guarded); primary fast-forwarded to the merge commit; worktree + local/remote branches pruned. PR 5 branched from the post-merge main.

## 5. Combat Movement, Locks, and Facing Baseline Pack — PR 5

- [x] 5.1 Add strict concrete v1 schemas for the six movement declaration/invalid/locked/runtime/enhancement/facing discriminants assigned by `schema-pack-inventory.md`; ranged `AttackLocked` remains owned by task 6.
  - Receipt (2026-08-21): `CombatMovementBaselineSchemaPack.ts` registers the six inventory discriminants at baseline v1 (runtime `GameEventType` keys, `combat.<type>.v1` ids, no transitions, six-member `satisfies` exhaustiveness). The 12-kind `IMovementStep` union is mirrored as a `kind`-discriminated zod union; `MovementInvalid`'s 11-reason vocabulary and `RuntimeMovementStateChanged`'s source/conversion/LAM/infantry surface are exact; `hexCoordinateSchema` reused from the PR-4 shared module. The contract test pins that `attack_locked` is NOT registered (task-6 ownership).
- [x] 5.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures, including movement steps and resolved stand/prone outcomes.
  - Receipt (2026-08-21): per-variant valid fixtures — the enriched `movement_declared` fixture carries the resolved stand-up outcome fields plus a six-kind step chain (standUp, forward, turn, lateral, jump w/ mechanical-booster flag, chargeDeclared); 3-mutation matrix per variant (18 rejections) with the declared-movement mutations targeting the step union (missing step field, extra step field, unknown step kind); unknown discriminant + version fail closed. Pack unwired (grep: contract-test-only references). 16/16 contract tests green.
- [x] 5.3 Prove legacy movement compatibility is explicit in the baseline schema rather than reconstructed from current movement rules.
  - Receipt (2026-08-21): a dedicated pre-enrichment `LEGACY_MOVEMENT_DECLARED_PAYLOAD` fixture (only the seven fields legacy streams serialized — no mode/path/steps/decomposition) parses unchanged at baseline v1; every enrichment field is optional IN THE SCHEMA ITSELF, exactly as the payload interface declares for legacy compat, so nothing is reconstructed from current movement rules.
- [x] 5.4 Run focused movement tests and applicable quality/review gates.
  - Receipt (2026-08-21): pack contract 16/16; all sibling replay suites 69/69 (registry, campaign pack, lifecycle pack, legacy adapters, fingerprint); typecheck/lint/format clean; strict OpenSpec green; independent fresh-context schema review run with verdict + any findings recorded in the PR description.
- [x] 5.5 After merge, rerun exact main and prune before PR 6.
  - Receipt (2026-08-21): PR 5 merged as #1280 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 6 branched from the post-merge main.

## 6. Combat Ranged and Indirect Attack Baseline Pack — PR 6

- [x] 6.1 Add strict concrete v1 schemas for attack declaration/invalid/locked/revealed/resolved, spotting, designator, AMS, ammo-consumption, and four indirect-fire payloads.
  - Receipt (2026-08-21): `CombatRangedBaselineSchemaPack.ts` registers the thirteen inventory discriminants at baseline v1 (runtime `GameEventType` keys, `combat.<type>.v1` ids, no transitions, thirteen-member `satisfies` exhaustiveness). `AttackInvalid`'s 12-reason vocabulary, the AMS mount-snapshot record, the `IToHitModifier` list, and the four indirect-fire payloads (with each payload's exact base-vs-narrowed `basis`/`spotterId` semantics — SpotterSelected pinned to `'los'` + non-null spotter, NarcOverride pinned to `'narc'|'inarc'` + `z.null()` spotter) are exact mirrors.
- [x] 6.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures for public and redacted payload forms.
  - Receipt (2026-08-21): `attack_resolved` is a UNION of the public payload (full Edge/ammo/cluster audit surface) and the fog-of-war `IRedactedAttackResolvedPayload` stored form (attacker/weapon ids intentionally absent) — both fixtures parse, and the redacted form carries its own 3-mutation matrix in addition to the per-variant matrices (13 x 3 = 39 rejections + 3 redacted rejections); unknown discriminant + version fail closed. Pack unwired (grep proof). 32/32 contract tests green.
- [x] 6.3 Prove to-hit rolls, hit locations, cluster results, ammunition, and indirect-fire decisions are consumed from stored resolved data or pinned references.
  - Receipt (2026-08-21): retention test pins that the resolved payload's consumed d6 array, hit location, ammo bin reference, and Edge-superseded roll; the AMS cluster roll/modified roll and its d6 pair; and the indirect-fire basis/penalty/spotter-walked decision all survive validation byte-for-byte. The purity contract test pins the pack's runtime imports to `zod` + pure `@/types` modules + replay-local files — no catalog, clock, or RNG lookup can enter without failing.
- [x] 6.4 Run focused attack/indirect tests and applicable quality/review gates.
  - Receipt (2026-08-21): pack contract 32/32; all sibling replay suites 85/85; full unit lane green in this worktree; typecheck/lint/format clean; strict OpenSpec green; independent fresh-context schema review run with verdict + findings recorded in the PR description.
- [x] 6.5 After merge, rerun exact main and prune before PR 7.
  - Receipt (2026-08-21): PR 6 merged as #1281 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 7 branched from the post-merge main.

## 7. Combat Damage, Heat, and Critical Baseline Pack — PR 7

- [x] 7.1 Add strict concrete v1 schemas for damage, heat, pilot hit, unit/location/component destruction, transfer damage, ammo explosion, and critical-hit payloads.
  - Receipt (2026-08-21): `CombatDamageBaselineSchemaPack.ts` registers the twelve inventory discriminants at baseline v1 (runtime `GameEventType` keys, `combat.<type>.v1` ids, no transitions, twelve-member `satisfies` exhaustiveness). The shared canonical `IHeatPayload` shape backs BOTH heat discriminants (including the strict dissipation `breakdown` block); `PilotHit`'s 6-member source union, `UnitDestroyed`'s 7-member cause union, `HeatEffectApplied`'s 6-member effect union, and the ammo-explosion source/CASE vocabularies are exact.
- [x] 7.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures, including redacted destruction variants where persisted.
  - Receipt (2026-08-21): `unit_destroyed` is a UNION of the public cause/killer payload and the fog-of-war redacted unit-id-only form — both fixtures parse, the redacted form carries its own 3-mutation matrix on top of the 12 x 3 per-variant matrices (36 + 3 rejections); unknown discriminant + version fail closed. Pack unwired (grep proof). 30/30 contract tests green.
- [x] 7.3 Prove damage/critical outcomes validate stored resolved values without invoking the live damage or critical resolver.
  - Receipt (2026-08-21): retention test pins armor/structure remainders, the crit resolution's consumed d6 sequence and slot index, and the dissipation breakdown's water bonus byte-for-byte through validation; the purity contract test pins the pack's runtime imports to `zod` + pure `@/types` modules + replay-local files.
- [x] 7.4 Run focused damage/heat/critical tests and applicable quality/review gates.
  - Receipt (2026-08-21): pack contract 30/30; all sibling replay suites 117/117; typecheck/lint/format clean; strict OpenSpec green; independent fresh-context schema review run with verdict + findings recorded in the PR description.
- [x] 7.5 After merge, rerun exact main and prune before PR 8.
  - Receipt (2026-08-21): PR 7 merged as #1282 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 8 branched from the post-merge main.

## 8. Combat Physical, PSR, and Ground-Object Baseline Pack — PR 8

- [x] 8.1 Add strict concrete v1 schemas for physical declaration/resolution, PSR trigger/result, fall/stuck/stand, and ground-object pickup/drop payloads.
  - Receipt (2026-08-21): `CombatPhysicalBaselineSchemaPack.ts` registers the nine inventory discriminants at baseline v1 (runtime `GameEventType` keys, `combat.<type>.v1` ids, no transitions, nine-member `satisfies` exhaustiveness). The 18-member `PhysicalAttackEventType` union (core + melee-weapon variants), the 8-member displacement-reason union, the domino step-out option/context/decision chain, the iNarc pod selection intersection (team + pod type required, location optional), and `reasonCode: z.nativeEnum(PSRTrigger)` on every PSR-adjacent payload are exact mirrors.
- [x] 8.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures, including domino/step-out decisions.
  - Receipt (2026-08-21): per-variant valid fixtures — the kick declaration exercises limb/hit-table/domino-decision; the resolved DFA carries five per-cluster (damage, location) pairs, a two-entry displacement chain, and the full 12-d6 consumed sequence; ground-object pickup embeds the represented object state. 3-mutation matrix per variant (27 rejections; the physical-resolved mutations reach the nested cluster/displacement shapes); unknown discriminant + version fail closed. Pack unwired (grep proof). 22/22 contract tests green.
- [x] 8.3 Prove physical and PSR rolls/results are stored inputs and replay has no access to live piloting/RNG services.
  - Receipt (2026-08-21): retention test pins the PSR's consumed d6 pair + machine-readable reasonCode and the DFA's cluster/displacement/roll counts byte-for-byte through validation; the purity contract test pins the pack's runtime imports to `zod` + pure `@/types` modules + replay-local files.
- [x] 8.4 Run focused physical/PSR tests and applicable quality/review gates.
  - Receipt (2026-08-21): pack contract 22/22; all sibling replay suites 147/147; typecheck/lint/format clean; strict OpenSpec green; independent fresh-context schema review run with verdict + findings recorded in the PR description.
- [x] 8.5 After merge, rerun exact main and prune before PR 9A.
  - Receipt (2026-08-21): PR 8 merged as #1283 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 9A branched from the post-merge main.

## 9A. Combat Vehicle and Represented-System-State Baseline Pack — PR 9A

- [x] 9A.1 Add strict concrete v1 schemas for shutdown/startup, neural-interface, motive-damage/penalty, immobilization, turret-lock, crew-stun, and VTOL-crash payloads assigned by `schema-pack-inventory.md`.
  - Receipt (2026-08-21): `CombatVehicleBaselineSchemaPack.ts` registers the nine inventory discriminants at baseline v1 (runtime `GameEventType` keys, `combat.<type>.v1` ids, no transitions, nine-member `satisfies` exhaustiveness). The neural-interface 6-member reason union, motive 5-member severity union, and immobilization 5-member cause union are exact mirrors.
- [x] 9A.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures.
  - Receipt (2026-08-21): per-variant valid fixtures; 3-mutation matrix per variant (27 rejections); unknown discriminant + version fail closed. Pack unwired (grep proof). 22/22 contract tests green.
- [x] 9A.3 Prove temporal/rules/catalog-dependent results are represented by stored outcomes or pinned references and are not recomputed during validation.
  - Receipt (2026-08-21): retention test pins the shutdown check's consumed d6 pair + target number, the motive severity + d6 pair, and the VTOL crash fall damage byte-for-byte; the purity contract test pins the pack's runtime imports.
- [x] 9A.4 Run focused represented-system-state tests and applicable quality/review gates.
  - Receipt (2026-08-21): pack contract 22/22; ALL replay suites 191/191 in this worktree; typecheck/lint/format clean; strict OpenSpec green; independent fresh-context schema review run with verdict recorded in the PR description.
- [x] 9A.5 After merge, rerun exact main and prune before PR 9B.
  - Receipt (2026-08-21): PR 9A merged as #1284 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 9B branched from the post-merge main.

## 9B. Combat Terrain, Mission, Morale, and Withdrawal Baseline Pack — PR 9B

- [x] 9B.1 Add strict concrete v1 schemas for command-result, terrain/minefield, retreat/ejection, objective, morale, and withdrawal payloads assigned by `schema-pack-inventory.md`.
  - Receipt (2026-08-21): `CombatMissionBaselineSchemaPack.ts` registers the thirteen inventory discriminants at baseline v1 (runtime `GameEventType` keys, `combat.<type>.v1` ids, no transitions, thirteen-member `satisfies` exhaustiveness). CONCRETIZATION DECISION recorded in the pack header: `command_result_published.result` is typed `unknown` in the canonical interface, but every producer stores the projected `IPlayerCommandResult` envelope — the baseline locks that envelope field-exactly (4-member status, 9-member diagnosticEvent, 7-member reason kind, subject refs, state summary) and bounds `publicEffect` with a CLOSED recursive JSON-value grammar (no `z.unknown`, no passthrough); `domain` mirrors the interface's open string union as `z.string()`. Minefield operation (8) + reason (8), morale 7-level, and all withdrawal/objective vocabularies exact.
- [x] 9B.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures.
  - Receipt (2026-08-21): per-variant valid fixtures — the command-result fixture stores a full projected envelope with nested JSON publicEffect; the minefield fixture exercises the multi-entry map form. 3-mutation matrix per variant (39 rejections; the command-result mutations reach the envelope) PLUS a dedicated grammar-bound proof (a function inside `publicEffect` is rejected); unknown discriminant + version fail closed. Pack unwired (grep proof). 30/30 contract tests green.
- [x] 9B.3 Prove mission/rules-dependent results are represented by stored outcomes or pinned references and are not recomputed during validation.
  - Receipt (2026-08-21): resolved inputs (EMP roll/modifier/modified-roll triple, objective hold progress, morale from/to, terrain previous-state) are stored payload fields validated as data; the purity contract test pins the pack's runtime imports to `zod` + pure `@/types` modules + replay-local files.
- [x] 9B.4 Run focused terrain/mission/morale/withdrawal tests and applicable quality/review gates.
  - Receipt (2026-08-21): pack contract 30/30; ALL replay suites 221/221 in this worktree; typecheck/lint/format clean; strict OpenSpec green; independent fresh-context schema review (with a dedicated producer-path audit of the command-result concretization) recorded in the PR description.
- [x] 9B.5 After merge, rerun exact main and prune before PR 10.
  - Receipt (2026-08-21): PR 9B merged as #1285 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 10 branched from the post-merge main.

## 10. Combat Battle-Armor Baseline Pack — PR 10

- [x] 10.1 Add strict concrete v1 schemas for trooper/squad, swarm, leg attack, vibro-claw, mimetic, and stealth payloads.
  - Receipt (2026-08-21): `CombatBattleArmorBaselineSchemaPack.ts` registers the ten inventory discriminants at baseline v1 (runtime `GameEventType` keys, `combat.<type>.v1` ids, no transitions, ten-member `satisfies` exhaustiveness): trooper_killed, squad_eliminated, the three swarm variants (attach roll/target retained; dismount cause 4-member enum exact), leg_attack + leg_attack_resolved (hit location + crit modifier as stored strings/numbers), vibro_claw_attack_resolved (cluster missileHits retained), mimetic_bonus, and stealth_bonus (source 3-member enum exact). All object schemas `.strict()`, all numbers finite.
- [x] 10.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures.
  - Receipt (2026-08-21): per-variant valid fixtures keyed by runtime values; 3-mutation missing/extra/ill-typed matrix per variant (30 rejections, all `invalid-payload`); unknown discriminant (`trooper_revived`) + unknown version fail closed. Pack unwired (grep proof). 24/24 contract tests green.
- [x] 10.3 Prove battle-armor attack and defense results are replayed from stored values rather than live resolvers.
  - Receipt (2026-08-21): resolved battle-armor inputs (swarm rollTotal/targetNumber, leg-attack hitLocation/critModifier, vibro-claw missileHits/damage) are stored payload fields validated as data; the purity contract test pins the pack's runtime imports to `zod` + pure `@/types` modules + replay-local files — no catalog, clock, or RNG surface.
- [x] 10.4 Run focused battle-armor tests and applicable quality/review gates.
  - Receipt (2026-08-21): pack contract 24/24; typecheck/lint/format clean; strict OpenSpec green; independent fresh-context schema review (Grok 4.6 via cursor-agent, field-by-field vs BattleArmorCombatInterfaces) recorded in the PR description.
- [x] 10.5 After merge, rerun exact main and prune before PR 11.
  - Receipt (2026-08-21): PR 10 merged as #1286 (squash, SHA-guarded); the PhysicalAttackLocked inventory drift found by the task-11 live-union comparison was resolved by the reviewed spec-only amendment PR #1287 before implementation, per the inventory rule; PR 11 branched from the post-amendment main.

## 11. Complete Domain Registry Composition — PR 11

- [x] 11.1 Compose the campaign and combat packs with the registry kernel and prove exact coverage of seven campaign plus 81 combat canonical discriminants (80 frozen + `PhysicalAttackLocked` per the 2026-08-21 inventory amendment).
  - Receipt (2026-08-21): `ReplayBaselineDomainRegistry.ts` composes the campaign pack + all eight combat packs into `REPLAY_BASELINE_DOMAIN_SCHEMA_PACK`; the contract test proves the registered set EXACTLY equals the canonical 7 campaign + 81 combat values (set equality both directions, duplicate-free), with `PhysicalAttackLocked`'s strict `{unitId}` v1 schema added to the physical pack (matching `IAttackLockedPayload`, same contract as the ranged `AttackLocked`). Physical pack contract updated to the amended ten-member row (fixture + 3-mutation matrix).
- [x] 11.2 Add compile-time and runtime completeness guards so a new discriminant fails until a concrete schema, target version, and fixtures are registered.
  - Receipt (2026-08-21): dual completeness guards. COMPILE TIME - each pack exports its owner union; `COMBAT_COMPOSITION_COMPLETENESS` requires `[Exclude<GameEventType, union>, Exclude<union, GameEventType>] extends [never, never]` (mutant-proven: deleting one member from the physical union produced a tsc error in the composition file; restore -> clean), and the campaign pin is two-way (`satisfies readonly CampaignEventType[]` + `Exclude` never-check). RUNTIME - `assertReplayBaselineDomainCompleteness` throws `ReplayBaselineCompletenessError` carrying FULL missing/extra/duplicated evidence lists; `createReplayBaselineDomainRegistry` refuses to build from an incomplete composition. Fixture coverage - the composed fixture index must equal the canonical key set exactly, so a new discriminant fails until schema AND fixture register.
- [x] 11.3 Prove every supported starting version reaches exactly one current target and every unsupported type/version fails with typed evidence; representative sampling is insufficient.
  - Receipt (2026-08-21): full iteration, no sampling - `it.each` over ALL 88 canonical discriminants proves each reaches its single current target (v1) from its valid fixture with frozen equal payload, and a second `it.each` over ALL 88 proves version target+1 fails typed `unsupported-schema-version`; unknown discriminant fails typed `unknown-event-type`; a dedicated test pins every registration at target v1 / exactly one schema / zero transitions (collect-offenders-expect-empty). Guard evidence tests cover missing (`physical_attack_locked` named), extra (named), and duplicated compositions.
- [x] 11.4 Run the full schema/upcaster fixture matrix and applicable quality/review gates; keep production replay integration disabled.
  - Receipt (2026-08-21): full replay suite 429/429 in this worktree (all nine pack contracts + registry kernel + legacy adapters + fingerprint + composition); typecheck/lint/format clean; production replay integration still disabled - `ReplayBaselineDomainRegistry` has no importer outside `src/lib/events/replay/` (grep proof); strict OpenSpec green; independent fresh-context review (Grok 4.6) recorded in the PR description.
- [x] 11.5 After merge, rerun exact main and prune before PR 12.
  - Receipt (2026-08-21): PR 11 merged as #1288 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 12 branched from the post-merge main.

## 12. Deterministic Replay Input Provenance — PR 12

- [x] 12.1 Add an exhaustive manifest of which supported variants require resolved randomness, time, catalog/rules, or external-input provenance and how each requirement is satisfied.
  - Receipt (2026-08-21): `ReplayInputProvenanceManifest.ts` declares, for EVERY canonical discriminant (compile-time exhaustive via `satisfies Record<CampaignEventType | GameEventType, IReplayInputProvenance>`; runtime key-set equality vs the canonical 88 pinned in test), which resolved nondeterministic inputs replay depends on and how each is satisfied across four categories (randomness / logical time / catalog+rules / external). Empty entries are positive no-nondeterministic-input claims; the two union payloads (attack_resolved, unit_destroyed) carry documented exceptions enforced by their packs' union schemas.
- [x] 12.2 Reject a supported payload that lacks required resolved data or version-pinned references; never repair it from current services.
  - Receipt (2026-08-21): `assertReplayInputProvenance` rejects a supported payload lacking any manifest-declared resolved field with the NEW typed `missing-required-input` code (added to `UnsupportedReplayHistoryCode`), naming every missing field; it verifies presence only - never recomputes, refetches, or mutates (fixture-unchanged assertion). Self-verifying manifest: a per-listed-field delete-mutant sweep proves each listed field is ALSO schema-required, so a listed-but-optional field cannot exist (the sweep caught and evicted two during authoring: game_created.hexTerrain, game_ended.turns).
- [x] 12.3 Enforce and test a replay/upcast dependency boundary with no clock, RNG, network, or effect dispatcher access.
  - Receipt (2026-08-21): `ReplayDependencyBoundary.test.ts` statically proves the whole replay runtime surface (every `.ts` directly in `src/lib/events/replay/`, >= 12 files pinned) has zero clock/RNG/network/timer tokens (Math.random, Date.now, new Date, performance.now, fetch, XMLHttpRequest, WebSocket, setTimeout, setInterval, getRandomValues) and imports ONLY the pure allowlist (`zod`, `js-sha256`, the journal canonicalizer, `@/types/*`, replay-local) at runtime; `import type` exempt.
- [x] 12.4 Run deterministic replay fixtures twice, static dependency checks, and applicable quality/review gates.
  - Receipt (2026-08-21): full-88 double-run determinism sweep (byte-identical stringified payloads run-to-run, deep-equal to fixture); full replay suite 524/524 in this worktree; typecheck/lint/format clean; strict OpenSpec green; independent fresh-context review (Grok 4.6, manifest-honesty sampling across all nine packs) recorded in the PR description.
- [x] 12.5 After merge, rerun exact main and prune before PR 13.
  - Receipt (2026-08-21): PR 12 merged as #1289 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 13 branched from the post-merge main.

## 13. Projector Registry and Explicit No-State-Change — PR 13

- [x] 13.1 Add immutable projector ID/version registrations separate from event schema versions and application release identity.
  - Receipt (2026-08-21): `ReplayProjectorRegistry.ts` - `ReplayProjector<TState>` carries an immutable `projectorId` + `projectorVersion` identity validated at construction (typed `invalid-projector-registration` for empty ids / non-positive / non-integer versions). The kernel never reads schema versions or release identity; the header pins that checkpoint compatibility (PR 14) binds the two identities SIDE BY SIDE, never merged. A version bump is a new registration, not a mutation.
- [x] 13.2 Require every supported event to register an apply handler or a named, tested no-state-change decision; remove implicit missing-handler success from the new pipeline.
  - Receipt (2026-08-21): every decision is explicit - `{kind:'apply'}` handler or `{kind:'no-state-change', reason}` with a mandatory non-blank NAMED reason (typed failure otherwise). `project()` on an undecided event type throws typed `missing-projector-decision` BEFORE any state derivation - implicit missing-handler success does not exist in this pipeline. `assertReplayProjectorCompleteness` refuses a projector that does not decide every supported discriminant, tested against the real canonical 88. EXPLICIT NON-CLAIM: production reducer bindings for the 88 land with the library-integration/recovery PRs; this kernel enforces the mechanics they must satisfy.
- [x] 13.3 Add typed missing/duplicate projector failures and prove no partial projection or side effect is returned.
  - Receipt (2026-08-21): four-code typed `ReplayProjectionError` union (`invalid-projector-registration` / `duplicate-projector-decision` / `missing-projector-decision` / `incomplete-projector`) each carrying a frozen `eventTypes` evidence list; the completeness failure names EVERY missing discriminant (asserted list-equal to all 88 for an near-empty projector, and to exactly the one withheld discriminant for an 87/88 projector). No-partial-projection proofs: frozen input state unchanged after a missing-decision failure; no-state-change returns the SAME state reference; apply is pure state-in/state-out (frozen-input proof).
- [x] 13.4 Run focused projector tests and applicable quality/review gates without cutting over production replay.
  - Receipt (2026-08-21): projector contract 11/11 within the full replay suite 535/535 in this worktree; typecheck/lint/format clean; the module is swept by the PR-12 dependency-boundary test (pure imports only) and has no importer outside `src/lib/events/replay/` - production replay untouched; strict OpenSpec green; independent fresh-context review (Grok 4.6) recorded in the PR description.
- [x] 13.5 After merge, rerun exact main and prune before PR 14.
  - Receipt (2026-08-21): PR 13 merged as #1290 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 14 branched from the post-merge main.

## 14. Checkpoint Compatibility Core — PR 14

- [x] 14.1 Add immutable checkpoint metadata keyed by stream, fixed root branch, revision, schema-pipeline fingerprint, projector ID/version, source-tail digest, and state digest.
  - Receipt (2026-08-21): `ReplayCheckpointCompatibility.ts` - `IReplayCheckpointMetadata` binds the full identity set (streamId, fixed-root branchId, revision, schemaPipelineFingerprint, projectorId + projectorVersion, sourceTailDigest, stateDigest); `createReplayCheckpointMetadata` validates (typed `invalid-checkpoint-metadata` for blank identities, negative/fractional revision, non-positive projectorVersion) and freezes.
- [x] 14.2 Implement pure compatibility and tail-continuity evaluation with full replay as the reference path; incompatible caches produce no publishable state.
  - Receipt (2026-08-21): pure evaluation only - `evaluateReplayCheckpointCompatibility` returns a typed verdict naming EVERY mismatched binding and carries NO state on incompatibility (key-set pinned in test); `evaluateReplayTailContinuity` requires revision+1 ascending with typed expected/found gap evidence (late-start, gap, repeat, empty-tail cases); `selectReplayRecoveryBase` discards incompatible checkpoints from consideration entirely and falls back to `full-replay` - full replay stays the authoritative reference path. `digestReplayCheckpointState` = sha256 over canonicalized JSON (key-order-insensitive, proven).
- [x] 14.3 Prove target-schema/upcaster changes invalidate a prior checkpoint even when the projector version is unchanged.
  - Receipt (2026-08-21): proven against the REAL `ReplaySchemaRegistry.fingerprintPipeline` - two registries differing only in (a) the target schemaId and (b) an added v2 schema + upcaster transition produce different fingerprints for the same historical versions, and a checkpoint bound to the prior fingerprint evaluates incompatible with `mismatches === ['schemaPipelineFingerprint']` while projectorId/projectorVersion are held constant in the expectation.
- [x] 14.4 Run focused compatibility/digest tests and applicable quality/review gates.
  - Receipt (2026-08-21): checkpoint contract 26 tests within the full replay suite 562/562 in this worktree; typecheck/lint/format clean; module swept by the dependency-boundary test (pure imports: js-sha256 + journal canonicalizer) and unwired from production; strict OpenSpec green; independent fresh-context review (Grok 4.6) recorded in the PR description.
- [x] 14.5 After merge, rerun exact main and prune before PR 15A.
  - Receipt (2026-08-21): PR 14 merged as #1291 (squash, SHA-guarded; one CI rerun for an unrelated EADDRINUSE fixture-port flake in gm-two-player-campaign-qc on the shared runner); primary fast-forwarded; worktree + branches pruned; PR 15A branched from the post-merge main.

## 15A. SQLite Checkpoint Schema and Direct Integrity — PR 15A

- [x] 15A.1 Add an additive immutable SQLite checkpoint schema and indexes for the PR 14 metadata without changing journal authority or event rows.
  - Receipt (2026-08-21): migration v10 `replay_checkpoints_schema` (`SQLiteService.replayCheckpoints.migration.ts`, registered last in MIGRATIONS) - one ADDITIVE table binding exactly the PR-14 metadata (checkpoint_id PK; stream_id; branch_id pinned 'root'; safe-integer revision >= 0; sha256-hex CHECKed schema_pipeline_fingerprint / source_tail_digest / state_digest; projector_id + positive projector_version; nonempty state_json + recorded_at) with the UNIQUE identity tuple (stream, branch, projector id+version, fingerprint, revision) doubling as the selection index. Rows are WRITE-ONCE via a BEFORE UPDATE abort trigger; DELETE stays allowed (disposable cache). No foreign keys into, triggers on, or column changes to any journal table.
- [x] 15A.2 Add migration/idempotency and direct update/delete/tamper tests; prove corrupt checkpoint rows cannot alter authoritative history.
  - Receipt (2026-08-21): contract test - v10 applies + file-reopen idempotency (row survives, re-init clean); 13-case row-level rejection matrix (blank identities, non-root branch, negative/fractional revision, short/non-hex digests, zero version, empty state/recorded_at); UNIQUE tuple enforced; UPDATE aborts with the write-once message while DELETE succeeds; and the authority proof - journal batch+event rows byte-compared before/after checkpoint insert + full delete + tampered re-insert (unchanged), journal immutability triggers still fire on UPDATE/DELETE, PRAGMA foreign_key_list(replay_checkpoints) empty. Ledger pins in the journal migration test moved (MAX version 9 -> 10, migration row count 8 -> 9).
- [x] 15A.3 Run Node 22 native SQLite preflight, focused migration tests, typecheck/lint/format, strict OpenSpec/QC, and sequential integrity review.
  - Receipt (2026-08-21): Node 22 native preflight green (`scripts/qc/check-better-sqlite3-abi.mjs`: node v22.22.0, better-sqlite3 12.11.1, SQLite 3.53.2, NAPI 10); focused SQLiteService suites 31/31; typecheck/lint/format clean; strict OpenSpec green; sequential integrity review (fresh-context Grok 4.6, incl. INSERT OR REPLACE bypass probing) recorded in the PR description.
- [x] 15A.4 After merge, rerun exact main and prune before PR 15B.
  - Receipt (2026-08-21): PR 15A merged as #1292 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 15B branched from the post-merge main.

## 15B. SQLite Checkpoint Repository and Selection — PR 15B

- [x] 15B.1 Add atomic checkpoint write/read selection that admits only fully written compatible records and treats checkpoints as disposable caches.
  - Receipt (2026-08-21): `SQLiteReplayCheckpointRepository` (journal dir, borrowed-handle idiom; the replay dir stays pure) - `record` verifies the state bytes hash to the claimed digest BEFORE any write (typed `state-digest-mismatch`; typed non-JSON guard), then a single plain INSERT (never REPLACE, per the 15A integrity pin); slot collision is typed `duplicate-checkpoint`; re-record is explicit `discard` + `record`. `selectRecoveryBase` scans newest-revision-first for the exact pipeline identity and admits ONLY fully written, byte-vs-digest-true, kernel-compatible rows; corrupt/torn/mismatched rows are skipped and reported by id - never returned, repaired, or auto-deleted.
- [x] 15B.2 Prove selection never changes journal rows, authority high-water, or the full-replay fallback result.
  - Receipt (2026-08-21): selection is SELECT-only - the contract test seeds journal batch/event/high-water rows, snapshots events + batches + store_state + checkpoint rows, runs three selection shapes (match, stale fingerprint, revision-capped), and proves the snapshot byte-identical; the full-replay fallback verdict is unaffected by selection runs or corrupt rows present.
- [x] 15B.3 Add partial-write, reopen, compatibility-selection, and corrupt-row rejection tests against real SQLite.
  - Receipt (2026-08-21): real-SQLite (temp-file) coverage - record/select round trip; pre-write digest refusal leaves zero rows; duplicate slot + discard/re-record; planted digest-mismatched AND torn (invalid JSON) rows skipped with an earlier valid base admitted and both ids reported; all-corrupt/absent -> full-replay with evidence; stale fingerprint and mismatched caller-supplied sourceTailDigest never select; throughRevision head cap; file reopen persistence.
- [x] 15B.4 Run Node 22 native SQLite preflight, focused repository tests, typecheck/lint/format, strict OpenSpec/QC, and sequential integrity review.
  - Receipt (2026-08-21): Node 22 native preflight green; focused repository + full replay suites 573/573 in this worktree; typecheck/lint/format clean; strict OpenSpec green; sequential integrity review (fresh-context Grok 4.6, incl. the sourceTailDigest-default honesty probe) recorded in the PR description.
- [x] 15B.5 After merge, rerun exact main and prune before PR 16.
  - Receipt (2026-08-21): PR 15B merged as #1293 (squash, SHA-guarded; the independent review's REJECT->fix->re-review APPROVE cycle recorded in the PR); primary fast-forwarded; worktree + branches pruned; PR 16 branched from the post-merge main.

## 16. Full-Replay and Checkpoint Equivalence — PR 16

- [x] 16.1 Add authoritative and viewer-projection fixtures proving full replay equals compatible checkpoint-plus-contiguous-tail.
  - Receipt (2026-08-21): `ReplayEquivalenceHarness.ts` (pure composition of the merged kernels: registry upcast + projector fold + canonical digests) with contract fixtures proving checkpoint-plus-contiguous-tail EQUALS full replay - deep-equal state AND identical canonical digest - for BOTH the authoritative projector (hidden roll history retained) and an audience-safe viewer projector (no hidden data; digest proven distinct from the authoritative digest). The checkpoint fixture is built from a REAL prefix replay, never hand-typed state.
- [x] 16.2 Add mismatched schema pipeline, projector version, source digest, state digest, and tail fixtures that rebuild from an earlier base or full replay without publication.
  - Receipt (2026-08-21): five-class mismatch matrix - schema-pipeline fingerprint, projector version, source-tail digest, state digest (each named in the rejection evidence), and a gapped tail (tail-discontinuity) - every case rebuilds via FULL replay with the rebuilt state/digest proven equal to the reference full replay over the same history; `recoverState` parses the cached state ONLY after compatibility (digest expectations REQUIRED by type) + digestsVerified + tail continuity all pass, so incompatible-cache state is structurally unpublishable.
- [x] 16.3 Run every fixture twice and prove identical state and audience-safe digests.
  - Receipt (2026-08-21): double-run determinism - both projectors and the recovery path run twice with byte-identical canonical digests; the recovered state re-digests to its own claimed digest.
- [x] 16.4 Run focused equivalence tests and applicable quality/review gates with checkpoint use still disabled by default.
  - Receipt (2026-08-21): equivalence contract 9 tests within the full replay suite 573/573 in this worktree; typecheck/lint/format clean; harness swept by the dependency-boundary test and has no production importer - checkpoint use stays disabled by default; strict OpenSpec green; independent fresh-context review (Grok 4.6) recorded in the PR description.
- [x] 16.5 After merge, rerun exact main and prune before PR 17.
  - Receipt (2026-08-21): PR 16 merged as #1294 (squash, SHA-guarded); primary fast-forwarded; worktree + branches pruned; PR 17 branched from the post-merge main.

## 17. Per-Authority-Scope Quarantine — PR 17

- [x] 17.1 Add typed quarantine records for unsupported type/version, invalid payload, missing provenance, broken fixed-root continuity, canonicalizer mismatch, and digest mismatch.
  - Receipt (2026-08-21): `ReplayQuarantineRegistry.ts` - 8-member typed `ReplayQuarantineReason` union (the six tasked classes plus `upcast-failed` per the spec's fail-closed scenario and `unsupported-event-type`/`-schema-version` split); frozen `IReplayQuarantineRecord` (scope + reason + evidence list + message); `classifyReplayFailure` is compile-time total over `UnsupportedReplayHistoryCode` (const map + `satisfies Record` - a new code breaks the build); NOTE: every manifest-listed provenance field is also schema-required today, so the guardedProject provenance gate is defense-in-depth against future schema relaxation rather than a reachable path with current data. First quarantine wins: the original evidence stays the diagnosis.
- [x] 17.2 Block commands/publication only for the affected authority scope while a healthy control scope remains available.
  - Receipt (2026-08-21): isolation is per scope key - `assertScopeOperational` throws typed `ReplayScopeQuarantinedError` for EXACTLY the quarantined scope; `guardedProject` blocks a quarantined scope BEFORE any work and, on a replay failure, quarantines that scope and returns a typed `blocked` result with NO partial state (frozen-input proof). EVERY corruption test carries a healthy CONTROL scope that keeps accepting and projecting through the same registry instance; `guardedProject` also runs `assertReplayInputProvenance` after upcast, so a supported payload missing a declared resolved input quarantines as `missing-provenance` rather than projecting from a repaired guess; scope keys are JSON-array encoded (crafted-id collision test); programmer-bug throws (missing projector decision) deliberately propagate instead of laundering into unsupported history. Release is explicit and records the recovery action (the D7 session record); the registry is in-memory session state by design - durable storage was never tasked here.
- [x] 17.3 Keep branch parent/base/supersession checks deferred only until branch records exist; verify `add-authoritative-history-branches` explicitly owns their activation and do not weaken current fixed-root identity and digest checks.
  - Receipt (2026-08-21): verified `add-authoritative-history-branches` explicitly owns branch-era activation - its proposal claims immutable branch records anchored to parent/base/base-event-identity/integrity digest, activation via expected-head compare-and-swap, and durable correction leases. Nothing weakened here: the journal and checkpoint schemas keep their `branch_id = 'root'` pins, recovery verification is untouched, and `broken-root-continuity` is a first-class quarantine reason today.
- [x] 17.4 Run corruption-isolation tests and applicable quality/security/review gates.
  - Receipt (2026-08-21): corruption-isolation contract 13 tests within the full replay suite 586/586 in this worktree; typecheck/lint/format clean; module swept by the dependency-boundary test with no production importer; strict OpenSpec green; independent fresh-context QA+security review (Grok 4.6, incl. scope-key collision and fail-closed probing) recorded in the PR description.
- [ ] 17.5 After merge, rerun exact main and prune before PR 18.

## 18. Replay Library Pipeline Integration — PR 18

- [ ] 18.1 Route Replay Library file/API loading through the registered legacy adapter, schema/upcast, deterministic-input, and projector path.
- [ ] 18.2 Replace malformed-line skipping and unknown-event partial success with typed blocked history that preserves source identity and evidence.
- [ ] 18.3 Prove supported legacy replays retain byte/source identity and produce the same accepted state digest before and after integration.
- [ ] 18.4 Run focused Replay Library/API tests, `verify:qc:replay-recovery`, and applicable quality/review gates.
- [ ] 18.5 After merge, rerun exact main and prune before PR 19A.

## 19A. Cold Recovery and Snapshot Hydration Integration — PR 19A

- [ ] 19A.1 Route cold recovery and snapshot hydration through the same schema/upcast/projector registrations and checkpoint compatibility boundary.
- [ ] 19A.2 Prove both surfaces report the same stream, fixed root branch, range, schema-pipeline fingerprint, projector version, state digest, and audience-safe digest.
- [ ] 19A.3 Prove unsupported history yields no partial baseline or side effect while a healthy control scope continues; run focused recovery/snapshot tests, replay QC, and applicable quality/review gates.
- [ ] 19A.4 After merge, rerun exact main and prune before PR 19B.

## 19B. Live Catch-Up Integration — PR 19B

- [ ] 19B.1 Route live catch-up through the same schema/upcast/projector registrations and checkpoint compatibility boundary.
- [ ] 19B.2 Prove catch-up reports the same stream, fixed root branch, range, schema-pipeline fingerprint, projector version, state digest, and audience-safe digest as cold recovery.
- [ ] 19B.3 Prove unsupported history yields no partial catch-up publication or side effect while a healthy control scope continues; run focused catch-up/reconnect tests, replay QC, and applicable quality/review gates.
- [ ] 19B.4 After merge, rerun exact main and prune before PR 20.

## 20. Truthful Replay Blocked-State UI — PR 20

- [ ] 20.1 Add persistent blocked-state text, source/scope-safe reason, and recovery guidance for unsupported or quarantined Replay Library history.
- [ ] 20.2 Add accessible announcement/focus behavior and desktop/mobile layouts that never present partial replay as complete.
- [ ] 20.3 Add component/browser tests and inspect unique screenshots paired with API/quarantine evidence; screenshots alone are not completion proof.
- [ ] 20.4 Run focused UI tests, Replay Library browser checks, viewport/accessibility verification, and sequential independent visual/review-work passes.
- [ ] 20.5 After merge, rerun the clean Replay Library journey on exact main and prune before closeout.

## 21. Exact-Main Replay-Safety Closeout — Docs-Only PR

- [ ] 21.1 Rerun the complete 87-variant schema/upcaster matrix, deterministic-input boundary, projector coverage, checkpoint equivalence, corruption isolation, Replay Library, cold recovery, snapshot, catch-up, and accessible blocked-state receipts on exact main.
- [ ] 21.2 Reconcile overlapping umbrella requirements, verify `add-authoritative-history-branches` still names the parent/base/supersession activation handoff, sync the completed `event-store` and `replay-library` deltas, archive this change only when the active ledger and non-archive change inventory remain exact, and change no runtime authority.
- [ ] 21.3 Run strict OpenSpec/QC, final sequential replay-safety review, and `git diff --check`; record the exact-main SHAs and retained evidence.

Post-merge terminal evidence: after the closeout PR merges, verify the archived artifacts, active ledger, strict OpenSpec/QC, and replay-safety receipts on exact main, then prune the closeout branch/worktree. This is intentionally not an artifact checkbox because an archived change cannot truthfully record its own future merge SHA or branch deletion.
