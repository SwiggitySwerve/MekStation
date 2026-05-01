## 1. Client hook for pilot improvement actions

- [ ] 1.1 Create `src/hooks/usePilotImprovement.ts` with the `UsePilotImprovement` interface from design.md (improveGunnery, improvePiloting, purchaseAbility, isLoading, error). `purchaseAbility` MUST take `spaId: string` (NOT `abilityId`) — the route at `src/pages/api/pilots/[id]/purchase-ability.ts:113` only invokes `PilotService.purchaseSPA` when `body.spaId` is truthy; `body.abilityId` selects the legacy catalog path with no designation/gating support.
- [ ] 1.2 Define the response type `PilotImprovementResult` in `src/hooks/usePilotImprovement.types.ts` as a discriminated union matching the actual route response shapes (verified — none of the three routes return `IPilot`):

  ```ts
  type PilotImprovementResult =
    | { kind: 'gunnery'; success: true; newGunnery: number; xpSpent: number; xpRemaining: number }
    | { kind: 'piloting'; success: true; newPiloting: number; xpSpent: number; xpRemaining: number }
    | { kind: 'spa'; success: true; spaId: string; xpRemaining: number }
    | { kind: 'error'; success: false; error: string };
  ```

  Each hook method POSTs to the matching `/api/pilots/[id]/...` route, parses the route's actual delta response into the discriminated union, AND on success calls the coordinator action from task 1.5 to keep the campaign personnel store in sync, then returns the `PilotImprovementResult` to the caller.
- [ ] 1.3 Add unit test `src/hooks/__tests__/usePilotImprovement.test.ts` covering: success path returns the typed delta and triggers the coordinator action with the correct `Partial<IPerson>`, HTTP 500 surfaces in `error` (and does NOT call the coordinator), loading state toggles correctly
- [ ] 1.4 Verify the existing API routes accept the request shape used by the hook — read `src/pages/api/pilots/[id]/improve-gunnery.ts`, `improve-piloting.ts`, `purchase-ability.ts` and confirm body schema; do NOT modify the routes

## 1.5 Personnel-store sync coordinator (NEW — keeps the IPerson roster projection in lockstep with IPilot writes)

> Domain note: `IPerson` is the universal personnel record (techs, doctors, admins, MechWarriors all live there); `IPilot` exists only for personnel with pilot mechanics. For the pilot subset, `IPerson` carries a roster-projection of `IPilot.skills` / `IPilot.abilities` / `IPilot.career.xp` so the personnel page renders inline without round-tripping the pilot repo. The coordinator below keeps that projection in sync after pilot-side writes. See design.md Decision 4 addendum.

- [ ] 1.5.1 Add `updatePersonFromPilotDelta(pilotId: string, delta: PilotImprovementResult)` to `src/stores/campaign/usePersonnelStore.ts`. Implementation: look up the matching `IPerson` by pilotId; if absent, no-op (pilot may live outside the campaign roster). If present, derive a `Partial<IPerson>` from the delta's `kind`:
  - `'gunnery'` → `{ pilotSkills: { ...prior, gunnery: newGunnery }, xp: xpRemaining, xpSpent: xpSpent + prior.xpSpent }`
  - `'piloting'` → `{ pilotSkills: { ...prior, piloting: newPiloting }, xp: xpRemaining, xpSpent: xpSpent + prior.xpSpent }`
  - `'spa'` → `{ specialAbilities: [...prior, spaId], xp: xpRemaining }`
  - `'error'` → no-op

  Call the existing `updatePerson(pilotId, partial)` primitive at `usePersonnelStore.ts:102` (the write surface already exists; this is a thin coordinator over it).
- [ ] 1.5.2 Add unit test `src/stores/campaign/__tests__/updatePersonFromPilotDelta.test.ts` covering: each delta `kind` produces the expected `Partial<IPerson>`, no-op on missing pilotId, no-op on `kind: 'error'`.
- [ ] 1.5.3 Document the known `addPerson` upsert collision in `design.md` Risks section: post-battle reports fire `addPerson` (full-record Map upsert at `usePersonnelStore.ts:88-93`, last-write-wins) which can overwrite a coordinator's prior write if the report carries a stale `IPerson`. Out of scope for this PR; flag in MEMORY for follow-up.

## 2. Wire `PilotProgressionPanel` to the hook

- [ ] 2.1 Update `src/components/pilots/PilotProgressionPanel.tsx` so the `onUpgrade` callback calls `usePilotImprovement().improveGunnery|improvePiloting`
- [ ] 2.2 Pass `isLoading` and `error` from the hook into `SkillUpgradeRow`; extend `disabled` to include `isLoading`; surface `error` in the panel's existing error region
- [ ] 2.3 Re-run the existing test file for `PilotProgressionPanel` and add scenarios for: "Successful gunnery improvement re-renders panel with new gunnery", "API error surfaces in panel and pilot is unchanged"
- [ ] 2.4 Verify the standalone pilot detail page (`pages/gameplay/pilots/[id].tsx`) still renders correctly — the panel's prop signature must be unchanged

## 3. Wire `PilotAbilitiesPanel` to the hook

- [ ] 3.1 Update `src/components/pilots/PilotAbilitiesPanel.tsx` so the `onUpdate` callback calls `usePilotImprovement().purchaseAbility(pilotId, abilityId, designation)`
- [ ] 3.2 Surface `isLoading` / `error` consistent with the progression panel
- [ ] 3.3 Add a test scenario for "Successful SPA purchase from abilities panel re-renders pilot with new ability and reduced XP"

## 4. Campaign roster side panel

- [ ] 4.1 Create `src/components/campaign/personnel/PersonnelSidePanel.tsx` with tabs `Progression | Abilities | Assignment`. Mount the existing `PilotProgressionPanel` and `PilotAbilitiesPanel` as the first two tab contents
- [ ] 4.2 Update the personnel-roster row in `src/pages/gameplay/campaigns/[id]/personnel.tsx` (or its current component file — verify with Glob first) to make rows clickable, opening the side panel with the selected pilot id
- [ ] 4.3 Use `useState` to gate side-panel mount (interaction-only — no SSR render); confirm no React hydration warning in dev
- [ ] 4.4 Style the side panel as a within-page column matching the campaign-detail layout convention (per design.md decision 2). Use Tailwind utilities; no new CSS files
- [ ] 4.5 Add component test for `PersonnelSidePanel` covering: opens on row click, tab switching renders correct child panel, close button restores roster scroll
- [ ] 4.6 Verify SSR safety per `Requirement: SSR and Hydration Safety` (campaign-ui spec)

## 5. Crew Assignment panel

- [ ] 5.1 Create `src/components/campaign/personnel/CrewAssignmentPanel.tsx` rendering: current assignment summary (or "Unassigned"), a filtered list of compatible unassigned units, an "Assign" button per row, and an "Unassign" button when an assignment exists
- [ ] 5.2 Filter unit list client-side by pilot role — `MECHWARRIOR` → BattleMechs only, vehicle-crew roles → vehicles only. Use existing role enums from `src/types/personnel/`
- [ ] 5.3 Wire "Assign" to the campaign-store action that wraps `CampaignInstanceAssignmentOperations.assignPilotToUnit(pilotId, unitId)`. If no wrapper action exists, add a thin one in `src/stores/campaignStore` named `assignPilotToUnit` and `unassignPilot` — do not redesign the action shape. **After the assignment-service call succeeds, the wrapper MUST also call `usePersonnelStore.updatePerson(pilotId, { unitId })` so the personnel-roster `IPerson` row reflects the assignment** (the assignment service writes to the campaign instance, not to `IPerson`; without this sync, the Crew Assignment "Display current assignment" scenario fails).
- [ ] 5.4 Wire "Unassign" to the matching unassign action. **The wrapper MUST also call `usePersonnelStore.updatePerson(pilotId, { unitId: undefined })` after success** to clear the assignment on the roster row.
- [ ] 5.5 Surface API errors via the panel's error region (consistent with progression/abilities panels)
- [ ] 5.6 Add component test covering all 7 scenarios from the campaign-ui spec's "Crew Assignment Panel" requirement: display current assignment, display compatible unassigned units, assign, unassign, reassign auto-unassigns prior, role filter excludes incompatible units, API error surfaces in panel

## 6. End-to-end smoke + verification

- [ ] 6.1 Add an integration test `src/__tests__/integration/campaignRosterActionFlows.test.ts` that walks the round trip: open roster → click pilot row → spend XP via Progression tab → assign pilot to unit via Assignment tab → verify campaign-store mutations are persisted and survive a tab close+reopen
- [ ] 6.2 Run `npm run build` and confirm no TS errors
- [ ] 6.3 Run `npm run test` and confirm 100% pass; address any new test failures (no flake quarantines)
- [ ] 6.4 Run `npx oxfmt --check .` (full repo, not just `src/`) and `npx tsc --noEmit` per the documented Format Check pitfall in MEMORY
- [ ] 6.5 Run `npx openspec validate add-campaign-roster-action-flows --strict` and confirm zero issues
- [ ] 6.6 Confirm BV parity unaffected: spot-check one validation run of `scripts/validate-bv.ts` if any backend code was touched (expected: untouched, so this is a guard)
