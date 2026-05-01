## Context

### Current state — four parallel personnel data layers

| # | Layer | Type | Store | Wiring status | Authoritative for |
|---|---|---|---|---|---|
| 1 | Vault | `IPilot`, `IUnit` | `usePilotStore`, `/api/pilots/*`, `/api/forces/assignments/*` | ✅ FULLY WIRED | PC progression — skills, XP, abilities, traits, persistent identity |
| 2 | Lightweight roster | `ICampaignPilotState` | `useCampaignRosterStore` | ✅ WIRED | Campaign-scoped pilot state — wounds, recovery, kills-this-campaign, status |
| 3 | Heavyweight personnel | `IPerson` | `usePersonnelStore` | ⚠️ HALF-WIRED — store created but never seeded; `pilotToPerson()` migration helper has zero callers; `IPerson.unitId` never written by production code | Salary, recruitment date, contract, healing, turnover, prisoner events, life events, vocational training, awards — but NONE of these features actually work because the store is empty in every campaign |
| 4 | Campaign Instance | `ICampaignPilotInstance` | `CampaignInstanceService` | ❌ ZERO production callers — service layer fully built and tested in isolation, but no UI/API path exercises it | (Aspirational) per-campaign instance projection |

### What the spike resolved (council step 2)

The 1-day code-side spike (executed inside the prior `add-pilot-xp-spend-from-campaign` apply session) resolved the council's decision crux:

> **Question:** Does saved-campaign user data persist `IPerson` character-sheet fields that diverge from vault `IPilot`?
>
> **Answer:** **NO.** `IPerson` is half-wired vestigial code. `usePersonnelStore.persons` is created but never seeded — the migration helper `pilotToPerson()` has zero production callers across the codebase, and `IPerson.unitId` is never written by any production path. Saved campaigns load with an empty `personnel` Map; nothing reads divergent user-state from `IPerson` because no divergent state ever gets written there.

This rules out Hephaestus's Path B (which assumed `IPerson` was carrying persisted divergent state and required a real data migration) and unlocks Oracle's synthesis cleanly.

### The 13 silently-broken features (load-bearing on `IPerson`)

| # | Feature | File:Line | Symptom |
|---|---|---|---|
| 1 | Salary calculation | `src/lib/finances/salaryService.ts:420` | Reads `IPerson.salary`; returns 0 because store is empty |
| 2 | Food & housing tax | `src/lib/finances/taxService.ts:215` | Reads `IPerson.lifestyle`; returns 0 |
| 3 | Daily cost summary | `src/lib/finances/FinanceService.ts:155` | Aggregates 0+0 → 0 |
| 4 | Day-pipeline salary deduction | `src/lib/campaign/dayAdvancement.ts:329` | Deducts 0 from treasury daily |
| 5 | Injury healing | `src/lib/campaign/processors/healingProcessor.ts:18` | Iterates empty Map; never advances recovery |
| 6 | Turnover rolls | `src/lib/campaign/turnover/turnoverCheck.ts:257` | Iterates empty Map; never rolls |
| 7 | Turnover departures | `src/lib/campaign/processors/turnoverProcessor.ts:64` | Same |
| 8 | Life events | `src/lib/campaign/processors/randomEventsProcessor.ts:49` | Same |
| 9 | Prisoner events | `src/lib/campaign/processors/randomEventsProcessor.ts:63` | Same |
| 10 | Vocational training XP | `src/lib/campaign/processors/vocationalTrainingProcessor.ts:136` | Same |
| 11 | Auto-awards | `src/lib/campaign/awards/autoAwardEngine.ts:55` | Same |
| 12 | Personnel roster UI | `src/pages/gameplay/campaigns/[id]/personnel.tsx` (pre-`add-pilot-xp-spend-from-campaign`) | Renders empty list — fixed in step 3 by repointing to `useCampaignRosterStore` |
| 13 | Post-battle wound sync | `src/stores/campaign/useCampaignStore.ts:752` | Writes wounds into the empty Map; nothing reads them back |

Step 3 (`add-pilot-xp-spend-from-campaign`) repointed feature #12 (personnel roster UI) to `useCampaignRosterStore` and added the side-panel + assignment surface. The remaining 12 features stay broken until step 5 ships.

### Out-of-scope role expansion (deferred — D-fence)

The current `IPerson` schema already encodes 6 personnel roles (`MECHWARRIOR`, `TECH`, `DOCTOR`, `ADMIN`, `ASTECH`, `VEHICLE_CREW`). The council explicitly fenced these out of step 4: this change decides only the substrate shape, not which roles inhabit it. Step 5 only migrates the MechWarrior path (because the 13 broken features are all MechWarrior-coupled). Tech/doctor/admin/astech/vehicle-crew get their own follow-up change after step 5 ships.

## Goals / Non-Goals

**Goals:**

1. **Lock in the synthesis architecture.** Vault `IPilot` = identity (skills, XP, abilities, traits — persists across campaigns). Single campaign roster entry = employment (salary, contract, recovery, kills-this-campaign, prisoner status, mech assignment, training in progress — campaign-scoped, holds `pilotId` reference). Layer 4 (`ICampaignPilotInstance`) retired.
2. **Specify the field contract** for the new roster entry at sufficient detail that `migrate-personnel-to-roster-employment` has an unambiguous target. Document which fields come from Layer 2 (`ICampaignPilotState`), which come from Layer 3 (`IPerson`), and which are net-new.
3. **Enumerate the migration plan** at task-level granularity for the 13 broken features — file paths, store-action signatures, test surfaces. Step 5's tasks.md becomes a near-mechanical translation of this plan.
4. **Document the deletions** with explicit code paths so step 5's grep targets are unambiguous.
5. **Document the rollback contract** so the change is safe to ship even if a regression is discovered post-merge.

**Non-Goals:**

- Implementing any of the migration. Step 5 does that.
- Adding non-MechWarrior roles. Out of scope.
- Modifying the cross-campaign character continuity flag (PC vault-wide vs NPC campaign-scoped) beyond reaffirming the council's existing decision. The flag mechanism (a `vaultPilotId` XOR `statblockData` discriminator on the roster entry) is locked here, but UI for managing PC promotion / NPC instantiation ships separately.
- Touching the unit construction system, BV calculator, or any non-personnel surface.
- Adding any new API routes. Step 5 may add `/api/campaign-roster/*`-shaped routes (replacing `/api/personnel/*`); this design notes the shape but does not require it.

## Decisions

### Decision 1: Identity-vs-Employment Split (synthesis architecture)

**The single roster entry replaces both Layer 2 (`ICampaignPilotState`) and Layer 3 (`IPerson`). It holds a `pilotId` reference to vault `IPilot` and never duplicates skills/XP.**

| What lives in Vault `IPilot` | What lives in Campaign Roster Entry |
|---|---|
| Identity: name, callsign, gender, date of birth, portrait, biography | Employment relationship: hire date, contract terms, salary override (if any) |
| Combat skills: gunnery, piloting, ASF gunnery, anti-mech | Current campaign state: wounds, recovery time remaining, fatigue |
| Career XP, total XP earned, XP-spend ledger | Campaign-scoped statistics: kills this campaign, missions this campaign, XP earned this campaign |
| Pilot abilities (SPAs, traits, edge) | Current assignment: assigned unit ID, role |
| Career history: missions completed, victories, defeats, kill records | Status: Active / Wounded / MIA / Captured / KIA / Departed (campaign-scoped — a pilot can be Departed in one campaign and Active in another) |
| Persistent affiliation, faction, callsign | Prisoner status, custody details (campaign-scoped) |
| Created-at / updated-at | Vocational training in progress (campaign-scoped, time-windowed) |

**Rationale:** Identity persists across campaigns by definition (the same character can be hired by different mercenary outfits across the user's save files). Employment terms are campaign-scoped by definition (the salary contract you have with House Davion in Campaign A is irrelevant to your Periphery merc gig in Campaign B). The two were entangled in `IPerson` because that type tried to be both — leading to the half-wired state where neither concern is fully served.

**Why not just extend `IPerson`?** Because `IPerson` is the wrong substrate. It owns skills/XP (identity concerns) AND salary/contract (employment concerns) AND wounds/recovery (campaign state) in one record. Even if we seed it correctly, the cross-campaign continuity story breaks: the same character would need a separate `IPerson` row per campaign, with the skills/XP fields manually kept in sync. That sync IS the bug the council convened to fix.

**Why not keep `ICampaignPilotState` and just extend it?** That's actually what we're doing — we're calling the new type "Campaign Roster Entry" but it's a superset of `ICampaignPilotState` with employment fields added. The naming change reflects the broader scope. See Decision 4.

### Decision 2: Layer 4 (`ICampaignPilotInstance`) is deleted entirely

**`ICampaignPilotInstance` and `CampaignInstanceService` are deleted in step 5.** Zero production callers; tests in isolation only. Its existence has been a source of confusion (every onboarding engineer asks "which pilot record?" because the answer is "all four, and three of them are wrong").

**Rationale:** YAGNI. The aspirational projection layer was built before the real wiring needs surfaced. Now that we know the actual contracts (vault for identity, roster for employment), the projection layer is unnecessary middleware.

### Decision 3: PC vs NPC discriminator on the roster entry

**Roster entries discriminate via a `vaultPilotId` XOR `statblockData` field set:**

- **PC roster entry:** `vaultPilotId: string` references a vault `IPilot`. The pilot's identity (skills, XP, abilities) lives in vault and resolves via join. The same `vaultPilotId` can appear on roster entries in multiple campaigns.
- **NPC roster entry:** `statblockData: IPilotStatblock` carries an inline statblock (frozen identity snapshot). No vault join. The character is born and dies in this one campaign.

**Rationale:** The user's stated domain rule (PCs vault-wide, NPCs campaign-scoped) maps directly. NPCs are generated ad-hoc by the random-pilot generator and never persist beyond their campaign — a vault row for them would be lifetime overhead. PCs are the player's chosen characters and benefit from cross-campaign continuity.

**Promotion path (NPC → PC):** A campaign can "graduate" an NPC into vault by writing the inline `statblockData` into vault as a new `IPilot` and rewriting the roster entry from `statblockData` form to `vaultPilotId` form. The UI for this graduation is OUT of scope here (separate change), but the data shape supports it.

### Decision 4: New type name and code location

**The type is named `ICampaignRosterEntry` and lives at `src/types/campaign/CampaignRosterEntry.ts`.**

- Replaces `ICampaignPilotState` from `src/types/campaign/CampaignInterfaces.ts:141`.
- Replaces `IPerson` from `src/types/campaign/Person.ts`.
- Lives in `src/types/campaign/` (not `src/types/personnel/`) because the entry is fundamentally a campaign concern; vault `IPilot` is the personnel concern.
- The store is renamed `useCampaignRosterStore` (already exists; gets the new field shape) — no separate `usePersonnelStore` ships in step 5.

**Rationale:** Single canonical name. "Campaign Roster Entry" is unambiguous in conversation and code. "Personnel" stays available for vault-side concerns where the term remains correct.

### Decision 5: Migration plan (informs step 5's tasks.md)

Step 5 (`migrate-personnel-to-roster-employment`) executes in this order:

1. **Add the new fields to `ICampaignPilotState`** (it's already in the right place — `CampaignInterfaces.ts`). Rename interface to `ICampaignRosterEntry`. Re-export under both names for one PR cycle to avoid breaking imports.
2. **Update `useCampaignRosterStore`** to write the new fields. Update the campaign-creation flow (`createCampaign`) to seed the employment fields from vault pilot defaults.
3. **Repoint each of the 12 remaining broken features** (feature #12 already repointed in step 3):
   1. `salaryService.ts:420` — read `roster.salary` instead of `IPerson.salary`.
   2. `taxService.ts:215` — read `roster.lifestyle` instead.
   3. `FinanceService.ts:155` — aggregate from roster.
   4. `dayAdvancement.ts:329` — sum salaries from roster.
   5. `healingProcessor.ts:18` — iterate `useCampaignRosterStore.pilots`, advance `recoveryTime`.
   6. `turnoverCheck.ts:257` — iterate roster.
   7. `turnoverProcessor.ts:64` — same.
   8. `randomEventsProcessor.ts:49` (life events) — iterate roster.
   9. `randomEventsProcessor.ts:63` (prisoner events) — iterate roster.
   10. `vocationalTrainingProcessor.ts:136` — iterate roster, write `trainingInProgress`.
   11. `autoAwardEngine.ts:55` — iterate roster.
   12. `useCampaignStore.ts:752` (post-battle wound sync) — write wounds into roster.
4. **Delete the legacy types and stores:**
   - Delete `src/types/campaign/Person.ts` (`IPerson`, `IPersonAttributes`, related types).
   - Delete `src/stores/campaign/usePersonnelStore.ts`.
   - Delete `src/lib/campaign/utils/pilotToPerson.ts`.
   - Delete `src/types/campaign/CampaignPilotInstance.ts` (`ICampaignPilotInstance`).
   - Delete `src/services/campaign/CampaignInstanceService.ts` and its `__tests__` sibling.
   - Delete `/api/personnel/*` and `/api/campaign-instances/*` API routes (verify no external callers first via repo grep).
   - Delete `src/types/campaign/CampaignInterfaces.ts:141`'s `ICampaignPilotState` once the rename has completed.
5. **Lock the substrate:** add an ESLint or test-time guard that fails if any code imports `IPerson` / `usePersonnelStore` / `ICampaignPilotInstance` so future changes can't accidentally re-introduce them.
6. **Update `personnel-management` spec** — REMOVE all `IPerson`-shaped requirements (Person Entity, Personnel Store CRUD, Personnel Store Persistence, Personnel Query, Backwards Compatibility with Pilot, Person Helper Functions, etc.). They are replaced by the two new requirements added in this design-only change.
7. **Verification:** all 13 features must demonstrably work end-to-end with rendered DOM / observable side-effect assertions (no store-state-only assertions, per the lesson learned in step 3). The post-battle wound sync test must show wounds appear in the personnel UI; the salary deduction test must show treasury balance drop on day-advance.

### Decision 6: Cross-campaign character continuity is implementable but not implemented in this change

The data shape supports the council's domain rule (same vault PC across multiple campaigns). The UI to actually browse "in which campaigns is Sergeant Lyran-Heart-Hawk active?" or to hire the same vault PC into a new campaign is OUT of scope. Step 5 is the data substrate; the UX layer is at minimum one further follow-up change.

### Decision 7: Rollback contract

If `migrate-personnel-to-roster-employment` ships and a critical regression is discovered:

- **Roll-forward, not roll-back.** The deletions in step 5 are large enough that revert+re-merge would be more error-prone than fixing forward.
- Each repointed feature is in its own commit (per step 5 tasks.md), so feature-level revert is possible without unwinding the whole substrate change.
- The substrate-rename commit (`ICampaignPilotState` → `ICampaignRosterEntry` with re-export) is the LAST commit in step 5 — until then both names work and the legacy types are still in tree. If we abort mid-way, we abandon the change without breaking trunk.

## Risks / Trade-offs

### Risk 1: Spec drift between this ADR and step 5's implementation

The danger: step 5 ships and the implementation differs from this design in some non-obvious way (e.g., a field rename, a different store API). Future readers see two contradicting requirements documents.

**Mitigation:**
- Step 5's `tasks.md` MUST include a "verify all decisions in `decide-campaign-personnel-architecture/design.md` are honored" task before the verification gate.
- This change's spec deltas (the two ADD'd requirements) are written at field-level granularity so step 5 can mechanically check against them.

### Risk 2: D-fence leakage

The danger: while writing step 5, the implementation discovers that fixing salary or healing requires touching tech/doctor/admin code (because shared finance code aggregates across all roles).

**Mitigation:**
- Step 5's scope statement explicitly limits to MechWarrior. Tech/doctor/admin code paths stay broken (they already are) until the role-expansion follow-up.
- If a shared utility needs touching, the touch is `// TODO: revisit when add-support-personnel-types ships`-fenced rather than expanded.

### Risk 3: NPC promotion path changes the discriminator field shape post-step-5

The danger: a future `add-npc-graduation-flow` change finds the `vaultPilotId` XOR `statblockData` field set is too rigid and wants to refactor to a discriminated union with a `kind` field.

**Mitigation:**
- The XOR-pair shape is what's locked. The promotion change is free to add a `kind: 'pc' | 'npc'` discriminator on top without breaking the contract — that's a refinement, not a violation.
- This design DOES note that a future discriminated-union refactor is permissible.

### Risk 4: Saved-campaign persistence schema change at step 5

The danger: existing saved campaigns have `personnel: Map<string, IPerson>` in their persisted state. Step 5 changes this to `pilots: ICampaignRosterEntry[]` (or equivalent). Players' save files break.

**Mitigation:**
- The persisted state of `IPerson` is empty in every saved campaign (per the spike). So "loading" the legacy field returns an empty Map and the new field gets populated from `useCampaignRosterStore.pilots` (which IS persisted with real data).
- Step 5's serialization layer drops the `personnel` field on read (no migration needed) and starts persisting `pilots` if it isn't already.
- A one-shot `MIGRATE_v0_to_v1` function in `useCampaignRosterStore` confirms this on store rehydration; if a future user has a save with non-empty `IPerson` data (which the spike rules out), the function logs a warning so we hear about it.

### Risk 5: Test coverage gap for the 13 features

The danger: many of the 13 broken features have NO test coverage today (they no-op silently, so nothing fails). Step 5 will need to write the tests AND the wiring simultaneously.

**Mitigation:**
- This is a feature, not a bug — step 5 ratchets the test count by ~12-20 new tests (one rendered-DOM-or-side-effect assertion per repointed feature). Per the lesson learned in step 3, `expect(store.field).toBe(x)` is not sufficient; the test must observe an end-to-end consequence (treasury balance change, wound appears in UI, recovery time advances on day-tick, etc.).
- Step 5's verification gate fails if any of the 13 features lack a passing assertion.

### Trade-off 1: 1-2 PR cycles of broken features

The 12 remaining broken features stay broken until step 5 ships. Players continue to see no salary deduction, no healing, etc. This is the council's accepted trade-off — fixing one at a time on the legacy substrate would re-create the architectural debt.

### Trade-off 2: Synthesis commits before non-pilot roles are designed

The single roster type is designed for pilots first. Tech/doctor/admin etc. will need to fit into the same shape OR the shape will need to accept extension fields. The design above leaves room for both: `kind: 'mechwarrior' | 'tech' | 'doctor' | ...` as a future addition is forward-compatible.

### Trade-off 3: Half-cycle naming inconsistency

During step 5's PR cycle, both `ICampaignPilotState` and `ICampaignRosterEntry` exist in tree (re-exported aliases). Anyone reading the code mid-cycle sees both names. The mitigation is to land step 5 in a single PR and squash-merge.
