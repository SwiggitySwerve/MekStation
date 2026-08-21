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

- [ ] 4.1 Add strict concrete v1 schemas for game creation/start/end, turn/phase boundaries, and initiative roll/order payloads.
- [ ] 4.2 Register the pack without composing it into production replay and add per-variant valid plus missing/extra/ill-typed fixtures.
- [ ] 4.3 Prove resolved setup/initiative inputs are retained and no current catalog, clock, or RNG lookup is needed to validate the pack.
- [ ] 4.4 Run focused lifecycle tests, Node 22 typecheck/lint/format, strict OpenSpec/QC, and sequential independent schema review.
- [ ] 4.5 After merge, rerun exact main and prune before PR 5.

## 5. Combat Movement, Locks, and Facing Baseline Pack — PR 5

- [ ] 5.1 Add strict concrete v1 schemas for the six movement declaration/invalid/locked/runtime/enhancement/facing discriminants assigned by `schema-pack-inventory.md`; ranged `AttackLocked` remains owned by task 6.
- [ ] 5.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures, including movement steps and resolved stand/prone outcomes.
- [ ] 5.3 Prove legacy movement compatibility is explicit in the baseline schema rather than reconstructed from current movement rules.
- [ ] 5.4 Run focused movement tests and applicable quality/review gates.
- [ ] 5.5 After merge, rerun exact main and prune before PR 6.

## 6. Combat Ranged and Indirect Attack Baseline Pack — PR 6

- [ ] 6.1 Add strict concrete v1 schemas for attack declaration/invalid/locked/revealed/resolved, spotting, designator, AMS, ammo-consumption, and four indirect-fire payloads.
- [ ] 6.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures for public and redacted payload forms.
- [ ] 6.3 Prove to-hit rolls, hit locations, cluster results, ammunition, and indirect-fire decisions are consumed from stored resolved data or pinned references.
- [ ] 6.4 Run focused attack/indirect tests and applicable quality/review gates.
- [ ] 6.5 After merge, rerun exact main and prune before PR 7.

## 7. Combat Damage, Heat, and Critical Baseline Pack — PR 7

- [ ] 7.1 Add strict concrete v1 schemas for damage, heat, pilot hit, unit/location/component destruction, transfer damage, ammo explosion, and critical-hit payloads.
- [ ] 7.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures, including redacted destruction variants where persisted.
- [ ] 7.3 Prove damage/critical outcomes validate stored resolved values without invoking the live damage or critical resolver.
- [ ] 7.4 Run focused damage/heat/critical tests and applicable quality/review gates.
- [ ] 7.5 After merge, rerun exact main and prune before PR 8.

## 8. Combat Physical, PSR, and Ground-Object Baseline Pack — PR 8

- [ ] 8.1 Add strict concrete v1 schemas for physical declaration/resolution, PSR trigger/result, fall/stuck/stand, and ground-object pickup/drop payloads.
- [ ] 8.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures, including domino/step-out decisions.
- [ ] 8.3 Prove physical and PSR rolls/results are stored inputs and replay has no access to live piloting/RNG services.
- [ ] 8.4 Run focused physical/PSR tests and applicable quality/review gates.
- [ ] 8.5 After merge, rerun exact main and prune before PR 9A.

## 9A. Combat Vehicle and Represented-System-State Baseline Pack — PR 9A

- [ ] 9A.1 Add strict concrete v1 schemas for shutdown/startup, neural-interface, motive-damage/penalty, immobilization, turret-lock, crew-stun, and VTOL-crash payloads assigned by `schema-pack-inventory.md`.
- [ ] 9A.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures.
- [ ] 9A.3 Prove temporal/rules/catalog-dependent results are represented by stored outcomes or pinned references and are not recomputed during validation.
- [ ] 9A.4 Run focused represented-system-state tests and applicable quality/review gates.
- [ ] 9A.5 After merge, rerun exact main and prune before PR 9B.

## 9B. Combat Terrain, Mission, Morale, and Withdrawal Baseline Pack — PR 9B

- [ ] 9B.1 Add strict concrete v1 schemas for command-result, terrain/minefield, retreat/ejection, objective, morale, and withdrawal payloads assigned by `schema-pack-inventory.md`.
- [ ] 9B.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures.
- [ ] 9B.3 Prove mission/rules-dependent results are represented by stored outcomes or pinned references and are not recomputed during validation.
- [ ] 9B.4 Run focused terrain/mission/morale/withdrawal tests and applicable quality/review gates.
- [ ] 9B.5 After merge, rerun exact main and prune before PR 10.

## 10. Combat Battle-Armor Baseline Pack — PR 10

- [ ] 10.1 Add strict concrete v1 schemas for trooper/squad, swarm, leg attack, vibro-claw, mimetic, and stealth payloads.
- [ ] 10.2 Register the pack and add per-variant valid plus missing/extra/ill-typed fixtures.
- [ ] 10.3 Prove battle-armor attack and defense results are replayed from stored values rather than live resolvers.
- [ ] 10.4 Run focused battle-armor tests and applicable quality/review gates.
- [ ] 10.5 After merge, rerun exact main and prune before PR 11.

## 11. Complete Domain Registry Composition — PR 11

- [ ] 11.1 Compose the campaign and combat packs with the registry kernel and prove exact coverage of seven campaign plus 80 combat canonical discriminants.
- [ ] 11.2 Add compile-time and runtime completeness guards so a new discriminant fails until a concrete schema, target version, and fixtures are registered.
- [ ] 11.3 Prove every supported starting version reaches exactly one current target and every unsupported type/version fails with typed evidence; representative sampling is insufficient.
- [ ] 11.4 Run the full schema/upcaster fixture matrix and applicable quality/review gates; keep production replay integration disabled.
- [ ] 11.5 After merge, rerun exact main and prune before PR 12.

## 12. Deterministic Replay Input Provenance — PR 12

- [ ] 12.1 Add an exhaustive manifest of which supported variants require resolved randomness, time, catalog/rules, or external-input provenance and how each requirement is satisfied.
- [ ] 12.2 Reject a supported payload that lacks required resolved data or version-pinned references; never repair it from current services.
- [ ] 12.3 Enforce and test a replay/upcast dependency boundary with no clock, RNG, network, or effect dispatcher access.
- [ ] 12.4 Run deterministic replay fixtures twice, static dependency checks, and applicable quality/review gates.
- [ ] 12.5 After merge, rerun exact main and prune before PR 13.

## 13. Projector Registry and Explicit No-State-Change — PR 13

- [ ] 13.1 Add immutable projector ID/version registrations separate from event schema versions and application release identity.
- [ ] 13.2 Require every supported event to register an apply handler or a named, tested no-state-change decision; remove implicit missing-handler success from the new pipeline.
- [ ] 13.3 Add typed missing/duplicate projector failures and prove no partial projection or side effect is returned.
- [ ] 13.4 Run focused projector tests and applicable quality/review gates without cutting over production replay.
- [ ] 13.5 After merge, rerun exact main and prune before PR 14.

## 14. Checkpoint Compatibility Core — PR 14

- [ ] 14.1 Add immutable checkpoint metadata keyed by stream, fixed root branch, revision, schema-pipeline fingerprint, projector ID/version, source-tail digest, and state digest.
- [ ] 14.2 Implement pure compatibility and tail-continuity evaluation with full replay as the reference path; incompatible caches produce no publishable state.
- [ ] 14.3 Prove target-schema/upcaster changes invalidate a prior checkpoint even when the projector version is unchanged.
- [ ] 14.4 Run focused compatibility/digest tests and applicable quality/review gates.
- [ ] 14.5 After merge, rerun exact main and prune before PR 15A.

## 15A. SQLite Checkpoint Schema and Direct Integrity — PR 15A

- [ ] 15A.1 Add an additive immutable SQLite checkpoint schema and indexes for the PR 14 metadata without changing journal authority or event rows.
- [ ] 15A.2 Add migration/idempotency and direct update/delete/tamper tests; prove corrupt checkpoint rows cannot alter authoritative history.
- [ ] 15A.3 Run Node 22 native SQLite preflight, focused migration tests, typecheck/lint/format, strict OpenSpec/QC, and sequential integrity review.
- [ ] 15A.4 After merge, rerun exact main and prune before PR 15B.

## 15B. SQLite Checkpoint Repository and Selection — PR 15B

- [ ] 15B.1 Add atomic checkpoint write/read selection that admits only fully written compatible records and treats checkpoints as disposable caches.
- [ ] 15B.2 Prove selection never changes journal rows, authority high-water, or the full-replay fallback result.
- [ ] 15B.3 Add partial-write, reopen, compatibility-selection, and corrupt-row rejection tests against real SQLite.
- [ ] 15B.4 Run Node 22 native SQLite preflight, focused repository tests, typecheck/lint/format, strict OpenSpec/QC, and sequential integrity review.
- [ ] 15B.5 After merge, rerun exact main and prune before PR 16.

## 16. Full-Replay and Checkpoint Equivalence — PR 16

- [ ] 16.1 Add authoritative and viewer-projection fixtures proving full replay equals compatible checkpoint-plus-contiguous-tail.
- [ ] 16.2 Add mismatched schema pipeline, projector version, source digest, state digest, and tail fixtures that rebuild from an earlier base or full replay without publication.
- [ ] 16.3 Run every fixture twice and prove identical state and audience-safe digests.
- [ ] 16.4 Run focused equivalence tests and applicable quality/review gates with checkpoint use still disabled by default.
- [ ] 16.5 After merge, rerun exact main and prune before PR 17.

## 17. Per-Authority-Scope Quarantine — PR 17

- [ ] 17.1 Add typed quarantine records for unsupported type/version, invalid payload, missing provenance, broken fixed-root continuity, canonicalizer mismatch, and digest mismatch.
- [ ] 17.2 Block commands/publication only for the affected authority scope while a healthy control scope remains available.
- [ ] 17.3 Keep branch parent/base/supersession checks deferred only until branch records exist; verify `add-authoritative-history-branches` explicitly owns their activation and do not weaken current fixed-root identity and digest checks.
- [ ] 17.4 Run corruption-isolation tests and applicable quality/security/review gates.
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
