# Design: Wire IPerson Hard-Cutover

> Source-of-truth references: Council #2 decision at `openspec/council-decisions/2026-05-02-cluster-E-iperson-hard-cutover.md` and canonical spec at `openspec/specs/campaign-personnel-architecture/spec.md`. This document covers implementation-level design decisions only.

## Decision: Two-arg helper signature (NOT god-type rename)

Every cross-store helper accepts:

```ts
function helperFn(entry: ICampaignRosterEntry, pilot: IPilot | null): ResultType {
  // entry provides campaign-scoped fields (wounds, recoveryTime, salary, etc.)
  // pilot provides vault identity (skills, abilities, career stats), or null for NPCs
}
```

Rationale (Council #2 ruling, both proposers and adversary converged):
- Two args make the dependency on each store explicit at the call site.
- A god-type rename (`IPersonnelView = ICampaignRosterEntry & { pilot: IPilot }`) re-conflates the two layers we just split. The vault/roster split exists precisely so the same vault pilot can be hired by multiple campaigns; bundling them into one type re-creates the original problem.
- Null vs non-null pilot is a discriminator for NPC vs persistent-pilot domains.

## Decision: Pre-join template (Map<pilotId, IPilot>)

Processors that iterate the roster pre-build a vault lookup once:

```ts
// In dayAdvancement or per-processor entry point:
const pilotsByPilotId = new Map<string, IPilot>(
  vault.pilots.map((p) => [p.id, p])
);

for (const entry of roster.pilots) {
  const pilot = pilotsByPilotId.get(entry.pilotId) ?? null;
  helperFn(entry, pilot);
}
```

Rationale:
- Avoids O(N²) `vault.find(p => p.id === entry.pilotId)` per helper invocation.
- The map is built once per pipeline run, not per helper.
- For helpers called outside processor pipelines (e.g., from UI components), the caller passes `pilot` directly (already known in context).

Lint gate: helpers SHALL NOT internally call `vault.find(...)` or any equivalent linear search over the vault list. Helpers receive the pilot pre-resolved.

## Decision: NPC domain matrix (per Council #2 open question #2)

Per-domain NPC handling, documented inline in each helper:

| Domain | NPC behavior |
|---|---|
| medical (healing, wounds, recovery) | Process — NPCs heal too (wounds tracked on roster entry, no vault pilot needed) |
| turnover (departure rolls) | Process — NPCs can leave too |
| ranks (officer status) | Skip if `pilot === null` — rank progression is vault-only |
| salary | Process — entry carries `salary` override or `BASE_MONTHLY_SALARY` |
| tax / finances | Process — finance is per-entry |
| progression (skill increase, XP spend) | Skip if `pilot === null` — vault-only |
| skills (skill checks) | Skip if `pilot === null` — vault-only |
| awards (medal/citation checks) | Skip if `pilot === null` — vault-only |
| vocational training | Skip if `pilot === null` — vault-only |
| random events | Process — events fire on roster entries |
| auto-awards engine | Skip if `pilot === null` |

Each helper SHALL document its NPC behavior in a JSDoc comment matching this table. PR2 per-domain commits include the doc additions.

## Decision: Delta-return contract for cross-store mutations

Helpers that change state in multiple stores return delta objects:

```ts
interface SkillProgressionDelta {
  readonly vault?: { readonly pilotId: string; readonly skillUpdates: Partial<IPilotSkills> };
  readonly roster?: { readonly pilotId: string; readonly xpDelta: number };
}

function progressSkill(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null
): SkillProgressionDelta {
  // Compute the delta. Do NOT call useStores().setState() here.
  // Caller decides when to commit.
}
```

Rationale:
- Processors are pure functions (input campaign state → output campaign state). They cannot side-effect mutate Zustand stores.
- The delta-return pattern lets the processor pipeline accumulate all changes and commit atomically at the end (consistent with `dayAdvancement.ts` immutable spread chain).
- Per Council #2 open question #3: "Delta-return contract for cross-store mutations: PR2 progression returns delta objects; PR3 processors commit deltas to right store."

## Decision: Atomic processor pipeline (no per-processor PR)

Council #2 verified `dayAdvancement.ts:425-452` chains 6 processors via immutable `ICampaign` spreads:

```ts
let working = campaign;
working = healingProcessor(working);
working = autoAwardsProcessor(working);
working = vocationalTrainingProcessor(working);
working = turnoverProcessor(working);
working = randomEventsProcessor(working);
working = postBattleProcessor(working);
return working;
```

Splitting this into 6 PRs would require maintaining cross-PR compatibility shims for the 5 intermediate states. Council ruled: ship as ONE PR (PR3). All 6 processors repoint atomically; integration tests verify identical outputs.

## Decision: Bridge function deletion in PR4 (not earlier)

`derivePersonnelFromRoster()` and `syncRosterFromPersonnel()` stay alive through PR2-PR3 because:
- Test fixtures (PR1, already shipped) call `rosterEntryToPerson()` to synthesize `IPerson` for legacy assertions.
- Production code in PR2-PR3 transitional state may still read `campaign.personnel` (which is bridge-derived).

PR4 deletes both bridge functions in the same commit as `ICampaign.personnel` removal — atomic cut.

The lossy Critical→Wounded round-trip bug at `useCampaignStore.ts:343-351` is in `syncRosterFromPersonnel` and is fixed BY the deletion (no round-trip means no downgrade).

## Decision: ICampaign.personnel removal cascade

PR4 removes `ICampaign.personnel`. Cascade fixes in same PR:
1. `isCampaign()` type guard at `Campaign.ts:163` — drop the `'personnel' in value` check (ruling: drop entirely, NOT keep as derived getter, per Council #2).
2. Legacy preservation merge at `useCampaignStore.ts:743-750` — delete the merge logic.
3. All factories that initialize `personnel: new Map()` — delete the field initialization.
4. All test fixtures still emitting `personnel: new Map()` (post-PR1 there should be none, but verify).

## Decision: PR5 cleanup verification

Final grep:

```bash
grep -rn "IPerson\b" src/  # word-boundary to exclude IPersonnelView etc.
# Expected: zero hits
```

If PR5's grep finds any reference, that reference is either:
- A new file added between PR4 and PR5 — escalate to fix in PR5.
- A residual file PR4 missed — fix in PR5.
- A legitimate use case we missed — STOP and reconsider.

## Open questions (to verify during PR2)

1. **`IInjury[]` migration**: lives on `IPerson.injuries`; verify `ICampaignRosterEntry.injuries` exists in PR2 medical commit; add if absent. Council #2 flagged this as the ONE understated risk.
2. **NPC checker functions in awards (~18 functions)**: verify each handles `pilot === null` correctly per the NPC domain matrix above.
3. **Type-layer helpers in `Campaign.ts:147,163,180,300`**: 4 helpers; verify each has the right two-arg signature after PR2 § type-layer commit.

## Open questions (to verify during PR3)

1. **Order of operations in `dayAdvancement.ts:425-452`**: confirm the 6-processor chain has no implicit data dependency on `campaign.personnel` being populated mid-chain (e.g., processor N reads what processor N-1 wrote into `personnel`).
2. **UI `.size` readers**: `campaigns/index.tsx:46` and `CampaignDashboardPage.sections.tsx:157` read `.size` on the Map. Replace with `useCampaignRosterStore.getState().pilots.length` (live count, not derived from snapshot).

## Open questions (to verify during PR4)

1. **Save game compat**: pre-release, no released users — but in-flight save files from current dev sessions may still serialize the `personnel` field. Verify deserialize path drops the field cleanly without throwing.
2. **`isCampaign()` callers**: grep for the type guard's call sites; ensure none of them implicitly relied on the personnel check for discrimination.
