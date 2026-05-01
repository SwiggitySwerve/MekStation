## Context

This is the implementation pair to the just-archived [`decide-campaign-personnel-architecture`](../archive/2026-05-01-decide-campaign-personnel-architecture/) ADR. Architectural rationale, four-layer current state, spike outcome, synthesis decisions, and the field contract for the new roster entry all live in that ADR. **This design.md cites the ADR but adds a critical scope correction discovered during pre-flight reconnaissance.**

### Scope correction (apply-time discovery)

The original proposal/design (and the ADR's Decision 5 migration plan) underestimated scope by conflating two distinct concerns:

1. **Runtime state.** The spike confirmed `usePersonnelStore.persons` is empty in every saved campaign — no divergent persisted user-state on `IPerson` runtime instances.
2. **Type surface area.** Independent of runtime state, the `IPerson` TypeScript type is imported as a function parameter signature by **72 production source files** across `src/lib/finances/`, `src/lib/campaign/{processors,turnover,medical,awards,events,progression,skills,ranks,maintenance}/`, and their tests.

Deleting the `IPerson` TYPE without first migrating those 72 files' parameter signatures would produce hundreds of TypeScript errors on `npx tsc --noEmit`. The original design assumed "no runtime callers" implied "delete the type" — those are different scopes.

**This change is narrowed to the M-effort the council estimated.** The full type-deletion is deferred to a follow-up `refactor-helper-signatures-to-roster-entry` change. The 12 silently-broken features still get fixed in THIS change via a shim approach.

### Inputs from the ADR (still load-bearing)

- Decision 1 — Identity-vs-Employment split table (still valid)
- Decision 3 — `vaultPilotId` XOR `statblockData` discriminator (still valid)
- Decision 4 — Type name `ICampaignRosterEntry` at `src/types/campaign/CampaignRosterEntry.ts` (still valid; new file added in Phase 1)
- Decision 7 — Rollback contract: substrate-rename commit lands LAST (still valid; phase ordering preserved)
- Risk 4 — Saved-campaign persistence migration (still valid; one-shot warn-log)
- Risk 5 — Test coverage gap (still valid; new tests cover the 12 repointed features + the shim)

### What changed from the ADR's plan

- ADR Decision 5 phase 4 listed deleting `IPerson` (`src/types/campaign/Person.ts`). **This change preserves `IPerson`** for helper-signature compatibility. The follow-up change deletes it.
- ADR Decision 5 phase 4 listed deleting `pilotToPerson()`. **This change replaces** `pilotToPerson()` with `rosterEntryToPerson(rosterEntry, vaultPilot)` — same idea, different inputs. The shim becomes load-bearing in this change.
- ADR Decision 5 phase 6 (spec REMOVEs) reduces from 13 to 4 in this change. The remaining 9 REMOVEs happen in the follow-up change after helpers stop importing `IPerson`.

## Goals / Non-Goals

**Goals:**

1. Fix the 12 silently-broken features without changing helper formulas. Each repointed feature reads from `useCampaignRosterStore`, synthesizes `IPerson` via the shim, calls existing helpers unchanged, and asserts a rendered-DOM or observable-side-effect test.
2. Add `ICampaignRosterEntry` with the locked field contract; make `useCampaignRosterStore` seed and round-trip the new fields.
3. Delete the genuinely-orphaned substrate (`usePersonnelStore`, `pilotToPerson()`, `ICampaignPilotInstance`, `CampaignInstanceService`, `/api/personnel/*`, `/api/campaign-instances/*`) — these have ZERO callers, confirmed by grep.
4. Preserve `IPerson` (the type) so helper-signature migration stays a separate, scopeable change.
5. Substrate-rename commit lands LAST so abort mid-PR leaves trunk valid.

**Non-Goals:**

- Migrating helper function signatures from `IPerson` to `ICampaignRosterEntry`. That's the follow-up change.
- Deleting the `IPerson` type. Same.
- Adding non-MechWarrior roles, salary/turnover formula changes, UI for cross-campaign continuity, or new API routes.

## Decisions

### Decision 1: `ICampaignRosterEntry` extends the existing `ICampaignPilotState` shape

The new type is the existing `ICampaignPilotState` (the lightweight roster type at `CampaignInterfaces.types.ts:141`) plus the employment + state + statistics + assignment + training fields locked in the ADR. The XOR discriminator (`vaultPilotId` vs `statblockData`) is added too — but the existing `ICampaignPilotState.pilotId: string` already serves the PC case, so the change is additive for PCs and adds the new `statblockData?: IPilotStatblock` field for NPCs.

The type stays at `src/types/campaign/CampaignRosterEntry.ts` (new file) re-exported from `src/types/campaign/CampaignInterfaces.ts` to keep import paths stable. The legacy name `ICampaignPilotState` is re-exported as a `@deprecated` type alias of `ICampaignRosterEntry` for the duration of this PR cycle. Phase 6 removes the alias.

### Decision 2: `rosterEntryToPerson` shim — the load-bearing bridge

A single function does the work of bridging the new substrate to the legacy helpers:

```typescript
// src/lib/campaign/utils/rosterEntryToPerson.ts
export function rosterEntryToPerson(
  rosterEntry: ICampaignRosterEntry,
  vaultPilot: IPilot | null,
): IPerson {
  // PC case: vault provides identity (skills, XP, abilities, traits, name)
  // NPC case: rosterEntry.statblockData provides identity inline
  const identity = vaultPilot ?? statblockToPilotShape(rosterEntry.statblockData);

  return {
    id: rosterEntry.pilotId,
    firstName: identity.firstName ?? splitName(identity.name).first,
    lastName: identity.lastName ?? splitName(identity.name).last,
    callsign: identity.callsign,
    primaryRole: deriveRoleFromVault(identity), // MECHWARRIOR for now
    rankIndex: identity.rankIndex ?? 0,
    skills: identity.skills, // gunnery + piloting from vault
    traits: identity.traits ?? [],
    xp: rosterEntry.campaignXpEarned, // campaign-scoped XP (not lifetime)
    totalXpEarned: identity.career?.totalXpEarned ?? 0,
    salary: rosterEntry.salary ?? defaultSalaryForRole(identity),
    lifestyle: rosterEntry.lifestyle ?? LifestyleTier.Standard,
    recruitmentDate: rosterEntry.hireDate ?? new Date(),
    wounds: rosterEntry.wounds,
    healingTime: rosterEntry.recoveryTime,
    status: mapCampaignStatusToPersonnelStatus(rosterEntry.status),
    unitId: rosterEntry.assignedUnitId ?? null,
    awards: identity.career?.awards ?? [],
    kills: rosterEntry.campaignKills,
    missions: rosterEntry.campaignMissions,
    /* ... etc — every IPerson field gets a source */
  };
}
```

**The shim is the integration point.** Helpers continue to call `(person: IPerson) => result`. The 12 repointed features call `rosterEntryToPerson(entry, vaultPilot)` per iteration and pass the result to the helpers. Helpers see no change.

**Performance:** Per-iteration object construction. For day-pipeline aggregations over a roster of N pilots, that's N construction ops per day-tick. Negligible (sub-microsecond per call). Not a hot path.

**Correctness:** The shim has a dedicated unit test (`rosterEntryToPerson.test.ts`) that asserts field-by-field equality between a fixture `(rosterEntry, vaultPilot)` input pair and a hand-written expected `IPerson` output. Plus a property test: `rosterEntryToPerson(...)` produces an object that satisfies `IPerson`'s structural type at compile time AND at runtime via a Zod schema check (if available).

### Decision 3: Per-feature repointing pattern (template)

```typescript
// BEFORE (legacy — usePersonnelStore is empty):
const personnel = useCampaignStore.getState().getPersonnelStore()?.getState();
const persons = Array.from(personnel?.persons.values() ?? []);
for (const p of persons) {
  doSomething(p); // helper takes IPerson
}

// AFTER (narrowed migration — synthesize IPerson on the fly):
const roster = useCampaignRosterStore.getState().pilots;
const vaultPilots = usePilotStore.getState().pilots;
for (const entry of roster) {
  const vaultPilot = vaultPilots.find(p => p.id === entry.pilotId) ?? null;
  const person = rosterEntryToPerson(entry, vaultPilot);
  doSomething(person); // helper unchanged
}
```

For server-side processors (`dayAdvancement.ts`, financial processors), the pattern uses `.getState()` reads. For client UI, store subscription via `useCampaignRosterStore((s) => s.pilots)` triggers re-renders.

### Decision 4: Saved-campaign persistence migration

Per ADR Risk 4. The `useCampaignRosterStore` already persists `pilots` via Zustand `persist`. The legacy `useCampaignStore.campaign.personnel: Map<string, IPerson>` field on saved state:

- On rehydrate, `useCampaignStore`'s `serializeCampaign` / `deserializeCampaign` (in `useCampaignStore.ts:317-360-ish`) drops the `personnel` field on read.
- One-shot `console.warn` fires if `serialized.personnel?.size > 0` on load (which would contradict the spike). Includes campaign id.
- 1-week soak window post-merge to monitor the warn-log. If zero hits, the warn-log itself is removed in a trivial follow-up.

### Decision 5: Test surface — 12-15 new tests

| Feature | Test asserts |
|---|---|
| Salary calculation | After day-advance, treasury balance drops by sum of roster salaries |
| Food & housing tax | After day-advance, treasury balance drops by lifestyle-tier-derived tax |
| Daily cost summary | UI shows correct daily-cost number for a roster with seeded salaries |
| Day-pipeline salary deduction | Integration test: full day-advance pipeline reduces treasury |
| Injury healing | After N day-advances, wounded pilot's `recoveryTime` decreases; status flips Wounded → Active when 0 |
| Turnover rolls | Pilot with high turnover risk eventually rolls departure across many day-ticks |
| Turnover departures | Departed pilot's status transitions; rendered roster UI hides them |
| Life events | Day-advance can trigger life events on roster pilots |
| Prisoner events | Captured pilot has prisoner-event tracking |
| Vocational training XP | After N day-advances, training progress advances; on completion, vault `IPilot.career.xp` increases |
| Auto-awards | Pilot completing N missions triggers expected award; `IPilot.career.killRecords` updates |
| Post-battle wound sync | After battle, wounded pilot's `wounds` value appears in roster UI render |
| `rosterEntryToPerson` shim | Field-by-field equality test (`PC case` + `NPC case` fixtures) |

Tests targeting `usePersonnelStore` directly are deleted (`usePersonnelStore.test.ts`). Tests targeting deleted services (`CampaignInstanceService.test.ts` and siblings) are deleted. Tests targeting `IPerson` directly are KEPT (the type is preserved).

### Decision 6: Substrate-rename commit lands LAST

Per ADR Decision 7. Phase 6 (the rename `ICampaignPilotState` → `ICampaignRosterEntry`) is the LAST commit in the PR. Until then, the alias keeps existing imports compiling. If any phase before 6 needs to abort post-merge, individual commits revert cleanly.

### Decision 7: API route deletion is gated on per-route grep

Phase 4.6/4.7 delete `/api/personnel/*` and `/api/campaign-instances/*` routes. Each deletion is gated on a per-route grep:

```bash
git grep "/api/personnel/" -- ':!src/pages/api/personnel/'  # zero hits required
git grep "/api/campaign-instances/" -- ':!src/pages/api/campaign-instances/'  # zero hits required
```

If grep returns hits, the route stays in tree and a comment is added: `// TODO: delete after refactor-helper-signatures-to-roster-entry confirms zero callers`.

## Risks / Trade-offs

### Risk 1: Shim drift over time

If `IPerson` evolves in the follow-up change (or any future change before the helper-signature migration ships), the shim's field mapping must stay in sync. Mitigation: the shim test asserts field-by-field equality, so any new field added to `IPerson` without updating the shim fails the test.

### Risk 2: Performance of per-iteration shim construction

For the 12 features, per-day-tick object construction across N roster entries is O(N) per feature. For typical campaigns (N ≤ 50 pilots), this is microseconds. For pathological cases (mega-mercenary outfits with hundreds of pilots), it's still milliseconds — well under the day-advance budget. If a hot-path bottleneck is discovered, the shim can be memoized with a `(rosterEntryHash, vaultPilotHash) → IPerson` cache.

### Risk 3: Helper formulas read fields the shim doesn't fill

A helper might call `person.someObscureField` that we forgot to map. TypeScript catches missing fields at compile time (because `IPerson` is preserved as a structural type — the shim's return type IS `IPerson`, so missing fields error). Runtime mismatch (wrong values) is caught by the field-by-field shim test plus per-feature rendered-DOM tests.

### Risk 4: Saved-campaign load fires the warn-log

Same as ADR Risk 4. 1-week soak window post-merge.

### Trade-off 1: Two parallel concepts in tree (during this PR cycle and into the follow-up)

`IPerson` (helper-typed) and `ICampaignRosterEntry` (storage type) coexist after this change ships. The shim bridges them. This is honest about scope and ships value (12 features start working) without forcing the 72-file helper-migration into the same PR. The cognitive load is one extra hop ("what is the shim's role?") but the scope reduction is large.

### Trade-off 2: 9 spec requirements stay in the spec describing a type that's still in tree

The 9 IPerson-shaped requirements that would have been REMOVED in the original plan stay until the follow-up change ships. They're still accurate descriptions of the `IPerson` type — they just describe a type that's now only used internally by helpers, not as runtime substrate.

### Trade-off 3: The follow-up change is a real obligation

`refactor-helper-signatures-to-roster-entry` is not a "nice to have" — it's a load-bearing follow-up. Without it, the shim stays in perpetuity and the architecture stays half-migrated. Estimated L-effort (1-2 weeks), spans 72 files, requires careful per-helper migration with regression tests.
