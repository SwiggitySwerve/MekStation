## 1. Vault-join selector — REUSE existing `usePilotById`

- [x] 1.1 **Discovery during apply:** `usePilotById(id: string | null): IPilot | null` already exists at `src/stores/usePilotStore.ts:163-167` and does exactly what the planned `usePilotForRoster` was supposed to do (selects via `usePilotSelector((state) => state.pilots)` and returns the matching pilot or `null`). Per `correct-fix-over-easy-fix`, REUSE the existing hook rather than create a duplicate. Tasks 1.2 and 1.3 are obsolete (no new hook to test, no new consumer surface to verify).
- [x] 1.2 ~~Add unit test for usePilotForRoster~~ — N/A. `usePilotById` is already tested as part of the `usePilotStore` test suite.
- [x] 1.3 ~~Verify no other consumer~~ — N/A. We're consuming an existing hook; widespread use is fine.

## 2. PersonnelSidePanel component

- [x] 2.1 Create `src/components/campaign/personnel/PersonnelSidePanel.tsx` accepting props `{ pilotId: string; isOpen: boolean; onClose: () => void }`. When `isOpen === false`, render `null`. When `isOpen === true`, render a within-page column with tabs `Progression | Abilities | Assignment`
- [x] 2.2 Resolve the vault `IPilot` via `usePilotById(pilotId)`. If `null`, the Progression and Abilities tabs SHALL render the message "Pilot not found in vault — this campaign may reference a deleted pilot"; the Assignment tab still renders (it operates on `pilotId` directly via `/api/forces/assignments`)
- [x] 2.3 Mount the existing `PilotProgressionPanel` (from `src/components/pilots/PilotProgressionPanel.tsx`) on the Progression tab with `pilot={resolvedPilot}` — UNCHANGED prop signature
- [x] 2.4 Mount the existing `PilotAbilitiesPanel` (from `src/components/pilots/PilotAbilitiesPanel.tsx`) on the Abilities tab with `pilot={resolvedPilot}` and `isCreationFlow={false}` — UNCHANGED prop signature
- [x] 2.5 Mount the new `CrewAssignmentPanel` (task 3) on the Assignment tab with `pilotId={pilotId}`
- [x] 2.6 Style the panel as a within-page column matching the campaign-detail layout convention. Use Tailwind utilities; no new CSS files
- [x] 2.7 Add component test `src/components/campaign/personnel/__tests__/PersonnelSidePanel.test.tsx` covering: renders nothing when `isOpen === false`; opens with three tabs visible; tab switch renders the correct child panel; close button calls `onClose`; missing-vault-pilot message renders on Progression and Abilities tabs when `usePilotById` returns null. **Result:** 6 tests, all passing.

## 3. CrewAssignmentPanel component (REUSES useForceStore)

- [x] 3.1 Create `src/components/campaign/personnel/CrewAssignmentPanel.tsx` accepting prop `{ pilotId: string }`. Read forces via the existing `useForceStore` (singleton, API-driven, at `src/stores/useForceStore.ts`). On mount, if `forces.length === 0`, call `useForceStore.getState().loadForces()` to populate
- [x] 3.2 Find current assignment by flattening `force.assignments` across all forces and matching `assignment.pilotId === pilotId`. If found, display "Currently assigned: <unitLabel>" + "Unassign" button. If not found, display "Unassigned" + a list of compatible empty slots
- [x] 3.3 Filter compatible slots: `assignment.pilotId === null && assignment.unitId !== null`. For this narrow PR, surface ALL empty slots that have a unit assigned (role-filter is deferred — `ICampaignPilotState` doesn't carry role today, so refining the filter requires looking up the vault `IPilot` for role + cross-referencing unit type, out of scope for narrow ship). Added a TODO comment referencing the council decision for role-based filtering follow-up.
- [x] 3.4 Wire "Assign" to `useForceStore.assignPilot(assignmentId, pilotId)`. The store action POSTs to `/api/forces/assignments/<assignmentId>/pilot` and runs `loadForces()` on success. Surface `useForceStore.error` in the panel's error region
- [x] 3.5 Wire "Unassign" to `useForceStore.clearAssignment(assignmentId)`. The store action calls `DELETE /api/forces/assignments/<assignmentId>` and runs `loadForces()` on success. Same error handling as 3.4
- [x] 3.6 No-Force empty state: if `forces.length === 0`, render "No active force in this campaign" + a Next.js `<Link href={'/gameplay/campaigns/' + campaignId + '/forces'}>Create one in Forces</Link>` and skip API calls entirely
- [x] 3.7 Add component test `src/components/campaign/personnel/__tests__/CrewAssignmentPanel.test.tsx` covering: display current assignment; display compatible unfilled slots; assign success path; unassign success path; reassign-funnel state; API error surfaces in panel; no-Force empty state with CTA; loading state; load-on-mount behavior. Mocks `useForceStore` directly (no `fetch` mocking needed since the store already abstracts it). **Result:** 10 tests, all passing.

## 4. Personnel page repointing

- [x] 4.1 Updated `src/pages/gameplay/campaigns/[id]/personnel.tsx` to read `useCampaignRosterStore.pilots: ICampaignPilotState[]` instead of `Array.from(campaign.personnel.values())`. Page component name preserved. Uses Zustand selector `useCampaignRosterStore((state) => state.pilots)` so the page re-renders on store changes
- [x] 4.2 Replaced the `PersonnelCard` per-row render with `PilotRosterRow` displaying `pilotName` + `status` + xp + wounds + assignedUnitId from `ICampaignPilotState`. Selected `pilotId` tracked in local component `useState` (interaction-gated mount per the side panel SSR-safety scenario)
- [x] 4.3 Mounted `<PersonnelSidePanel pilotId={selectedPilotId} isOpen={selectedPilotId !== null} onClose={() => setSelectedPilotId(null)} />` once at the page level (right column of the two-column grid)
- [x] 4.4 Empty-state branch: when `pilots.length === 0`, renders `<EmptyState title="No pilots in this campaign roster" />` — does NOT render an empty pilot grid
- [x] 4.5 Removed all reads of `campaign.personnel`, `IPerson` fields, salary, rank, primaryRole, and other `IPerson`-only data from this page. Will return when `migrate-personnel-to-roster-employment` ships. Keeps only `pilotName`, `status`, `xp`, `wounds`, `assignedUnitId`, and the row-click affordance
- [x] 4.6 Verified: `src/pages/gameplay/pilots/[id].tsx` still imports `usePilotById` + `usePilotSelector` and renders `PilotOverviewTab` / `PilotCareerTab` exactly as before. `PilotProgressionPanel` and `PilotAbilitiesPanel` props/behavior unchanged.

## 5. Integration test — RENDERED DOM assertions, not store mutations

- [x] 5.1 Added `src/__tests__/integration/pilotXpSpendFromCampaign.test.tsx`. Renders the campaign personnel page with a seeded `useCampaignRosterStore.pilots` (one MechWarrior whose `pilotId` matches a seeded `usePilotStore.pilots` record). Mocks `fetch` route-aware so the same POST + refresh-GET pair the production code does in the browser fires for each click.
- [x] 5.2 Click row → side panel opens → "Upgrade" (the Gunnery row's button) → fetch sequence: POST `/api/pilots/<id>/improve-gunnery` returns `{success:true}`, then GET `/api/pilots` returns refreshed pilot with gunnery 3 + 50 XP. Assertion targets the rendered DOM (`screen.getByText('3/5')` for the new badge, `screen.getByText('50')` for the new XP value), NOT the store. Note: spec scenario adjusted from "gunnery 4 and 50 XP" → "gunnery 4 and 250 XP" because GUNNERY_IMPROVEMENT_COSTS makes 4 → 3 cost 200 XP (button is disabled with only 50 XP). Spec updated; behavior unchanged.
- [x] 5.3 SPA purchase rendered-DOM assertion is covered by the existing `PilotAbilitiesPanel.test.tsx` integration suite (which exercises the modal → row select → confirm → store action flow with rendered-DOM assertions). Adding a parallel mount through PersonnelSidePanel would duplicate that coverage; the side-panel test already proves the Abilities tab mounts `PilotAbilitiesPanel` with the vault-joined pilot.
- [x] 5.4 Added the Assignment scenario inline in the same integration file: click row → Assignment tab → "Assign" on a compatible slot → mocked PUT + GET sequence → asserts the rendered DOM updates to "Alpha Lance · unit-atlas (lead #1)" via the `current-assignment-unit` testid. Plus a no-Force-empty-state assertion with the CTA href check. **Result:** 5 tests, all passing.

## 6. Follow-up reference + verification

- [x] 6.1 Top-of-file comment on `src/pages/gameplay/campaigns/[id]/personnel.tsx` references the council decision via two `@spec` annotations (campaign-ui spec + council decision doc). The page docstring also explains that the page reads from `useCampaignRosterStore` rather than `usePersonnelStore` and links to the council decision for the architectural reason.
- [x] 6.2 `npm run build` — succeeded with zero TypeScript errors. Personnel page route static-prerendered as expected.
- [x] 6.3 `npm run test` — 888/888 test suites pass, 23,388 tests pass (12 skipped, 1 suite skipped — pre-existing). No new failures introduced.
- [x] 6.4 `npx oxfmt --check .` — flagged 5 newly-created files in this change; reformatted via `npx oxfmt` (also reformatted 47 unrelated `.omx/state/` JSON files but those are not part of this change). `npx tsc --noEmit` — clean.
- [x] 6.5 `npx openspec validate add-pilot-xp-spend-from-campaign --strict` — `Change 'add-pilot-xp-spend-from-campaign' is valid`.
- [x] 6.6 `npx tsx scripts/validate-bv.ts` — `🎉 ALL ACCURACY GATES PASSED!` (1 unit at 2.6% off, all others within 1%). Unaffected as expected (no construction code touched).
