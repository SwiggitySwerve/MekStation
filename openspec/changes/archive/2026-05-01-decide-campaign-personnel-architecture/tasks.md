## 1. Architecture Decision Record (ADR) authoring

- [x] 1.1 Authored `design.md` with the synthesis architecture: vault `IPilot` = identity, single campaign roster entry = employment, Layer 4 retired. References the council decision at `openspec/council-decisions/2026-05-01-personnel-architecture-path.md`.
- [x] 1.2 Documented the four-layer current state, the spike outcome (`IPerson` is half-wired vestigial code — `pilotToPerson()` has zero callers, `IPerson.unitId` never written), and the 13 silently-broken features at file:line precision in design.md "Context" section.
- [x] 1.3 Documented the PC vs NPC discriminator (`vaultPilotId` XOR `statblockData`), the field-level contract for the new roster entry (Decision 1 table), and the type/file-name decisions (`ICampaignRosterEntry` at `src/types/campaign/CampaignRosterEntry.ts`) in design.md Decisions 1, 3, 4.
- [x] 1.4 Documented the migration plan at task-level granularity (Decision 5 — 6 ordered phases) so step 5's `tasks.md` is a near-mechanical translation. All 12 remaining broken features named with file:line; deletion list explicit.
- [x] 1.5 Documented the rollback contract (Decision 7) — roll-forward not roll-back; substrate-rename commit lands last so abort-mid-way leaves trunk intact.
- [x] 1.6 Documented the explicit hard scope fence (Non-Goals + proposal Hard scope fence section): no support-personnel role expansion, no salary/turnover formula changes, no UI for cross-campaign continuity, no API route additions.

## 2. Spec deltas — capture the architecture commitment

- [x] 2.1 Added `## ADDED Requirements` block to `specs/personnel-management/spec.md` (delta) with the "Personnel Substrate Architecture (Identity vs Employment Split)" requirement and 5 scenarios covering: identity ownership, employment ownership, PC/NPC scoping, Layer 4 retirement, and source-of-truth uniqueness.
- [x] 2.2 Added the "Campaign Roster Employment Record Contract" requirement with 7 scenarios specifying: identity reference (PC/NPC discriminator), employment fields, current state fields, campaign-scoped statistics, assignment and training fields, the no-duplication rule for identity fields, and persistence/round-trip behavior.
- [x] 2.3 Each scenario includes a concrete observable assertion (data-shape constraint or behavioral guarantee) so step 5's verification gate can mechanically check conformance.

## 3. Validation

- [x] 3.1 Ran `npx openspec validate decide-campaign-personnel-architecture --strict`. Result: `Change 'decide-campaign-personnel-architecture' is valid` — zero issues.
- [x] 3.2 Spec sync risk noted in design.md Risk 1; main spec at `openspec/specs/personnel-management/spec.md` is unchanged in this change (deltas merge in at archive time alongside existing `IPerson` requirements; both coexist for one PR cycle until step 5 REMOVEs the legacy ones).
- [x] 3.3 `proposal.md` Capabilities section names exactly the modified spec (`personnel-management`) and lists the two new requirements explicitly so the spec deltas are easy to audit against the proposal.
- [x] 3.4 Design doc's migration plan enumerates all 13 broken features with feature #12 noted as already-repointed in step 3 (`add-pilot-xp-spend-from-campaign`); the remaining 12 are explicit step-5 work.

## 4. Cross-link the council decision and the migration change

- [x] 4.1 `proposal.md` links to the council decision document at `openspec/council-decisions/2026-05-01-personnel-architecture-path.md` and to the SUPERSEDED prior change at `openspec/changes/archive/2026-05-01-superseded-add-campaign-roster-action-flows/`.
- [x] 4.2 `design.md` Risk 1 mitigation explicitly says step 5's `migrate-personnel-to-roster-employment` MUST include a verification task that all decisions in this design.md are honored.
- [x] 4.3 Confirmed via `git status` — the only files added by this change are inside `openspec/changes/decide-campaign-personnel-architecture/`. Modified files in working tree (`openspec/specs/campaign-ui/spec.md`, `src/pages/gameplay/campaigns/[id]/personnel.tsx`, plus the new `src/components/campaign/personnel/`, `src/__tests__/integration/pilotXpSpendFromCampaign.test.tsx`) are leftover from the previous `add-pilot-xp-spend-from-campaign` change, NOT from this one.

## 5. No production code edits — verification

- [x] 5.1 Verified via `git status --porcelain`: no `src/` edits originating from this change. The `src/` and `openspec/specs/campaign-ui/` modifications visible in the working tree are all from the prior archived change.
- [x] 5.2 Confirmed no edits land in `src/`, `scripts/`, `public/data/`, `__tests__/`, or any non-openspec directory from this change's authoring session.
- [x] 5.3 Confirmed `npm run build` and `npm run test` are NOT required for this change because there are no code edits to verify. The change's value is captured entirely in the proposal/design/specs/tasks documents.

## 6. Pre-archive readiness

- [x] 6.1 At archive, the spec deltas in section 2 sync into `openspec/specs/personnel-management/spec.md` as ADD'd requirements alongside the existing `IPerson`-shaped requirements (which remain UNTOUCHED in this change — they are REMOVED in step 5).
- [x] 6.2 No contradiction between this change's ADD'd requirements and the existing personnel-management requirements at archive time. The two coexist for one PR cycle (between this change's archive and step 5's archive). Documented as expected interim state in design.md (Trade-off 3).
- [x] 6.3 The `migrate-personnel-to-roster-employment` change can now be authored, with this design.md as its source-of-truth input. Step 5's tasks.md will be a mechanical translation of design.md Decision 5's 6-phase migration plan.
