# Design: Add Campaign Combat Loop

## Context

The campaign-to-combat-to-campaign round trip exists in pieces:

- **Scenario generation** — `scenarioGenerationProcessor` runs weekly, checks
  each combat team for a battle, and on a hit emits a `scenario_generated` day
  event carrying a deterministic `scenarioId` (`scn-<contractId>-<date>-<teamId>`),
  `contractId`, `opForBV`, `scenarioType`, `isAttacker`, and conditions.
- **Encounters** — `encounter-system` defines `IEncounter`, the launch snapshot,
  and the encounter store. A standalone encounter can be authored and launched.
- **Outcome intake** — `game-session-management` specifies that a completed
  `InteractiveSession` publishes `CombatOutcomeReady`, the campaign store
  enqueues it on `pendingBattleOutcomes`, and day advancement drains the queue
  through `postBattleProcessor` → `salvageProcessor` → `repairQueueBuilderProcessor`.

The gap is the **connective tissue**: a `scenario_generated` event never becomes
an `IEncounter`; a campaign mission has no launch path into a `GameSession`; and
nothing automatically routes a campaign-originated session's outcome back to its
campaign. This change supplies exactly those three connectors and freezes the
inventory schema CP2a will render. The combat-effects processors are reused
verbatim.

## Goals / Non-Goals

**Goals:**

- A generated scenario becomes a launchable encounter with full campaign
  linkage.
- Launching that encounter creates a campaign-linked `GameSession`.
- Finishing that session automatically feeds `pendingBattleOutcomes`.
- The post-battle inventory schema is frozen here so CP2a has a stable contract.
- Every connector is idempotent.

**Non-Goals:**

- Rebuilding the battle-effects processors.
- Any UI surface (CP2a).
- AI behavior (Wave 2), co-op launch (Wave 5).

## Decisions

### D1. Scenario-event → encounter bridge runs in the day pipeline

A new day processor (`scenarioEncounterBridgeProcessor`, phase
`DayPhase.EVENTS + 10` so it runs after `scenarioGenerationProcessor`) reads the
day's `scenario_generated` events from the pipeline result and, for each, builds
and persists an `IEncounter`. The bridge is a *consumer* of the event stream,
not a modification of `scenarioGenerationProcessor` — that processor stays
untouched, satisfying the all-ADDED constraint.

### D2. Encounter is built from scenario-event data + the contract

`buildEncounterFromScenario(event, campaign)` maps the `scenario_generated`
payload onto an `IEncounter`: the OpFor force from `opForBV` and `scenarioType`,
the player force from the contract's assigned combat team, map config from the
scenario conditions, and victory conditions from `scenarioType`. The encounter
carries `campaignMeta: { campaignId, contractId, scenarioId }` so every
downstream step can thread linkage back to the contract.

### D3. Idempotency keys

The bridge keys on `scenarioId`: a `campaign.bridgedScenarioIds` set records
every scenario already turned into an encounter; a re-run skips it. The
enqueue trigger keys on `matchId`, reusing the existing duplicate guard from the
`Campaign Store Enqueues Outcomes` requirement. Both keys are deterministic, so
re-running a day or replaying the pipeline produces no duplicates.

### D4. Frozen post-battle inventory schema

This is the contract CP2a depends on. **Frozen here, not changed by CP2a:**

```typescript
interface ICampaignInventory {
  readonly campaignId: string;
  readonly generatedAt: string;             // ISO 8601
  readonly repairBay: readonly IRepairBayItem[];
  readonly salvageBay: readonly ISalvageBayItem[];
  readonly medicalBay: readonly IMedicalBayItem[];
  readonly summary: IInventorySummary;
}

interface IRepairBayItem {
  readonly ticketId: string;                // from IRepairTicket
  readonly unitId: string;
  readonly kind: 'armor' | 'structure' | 'component' | 'ammo' | 'heat-recovery';
  readonly location: string | null;
  readonly expectedHours: number;
  readonly partsReady: boolean;             // all partsRequired matched
  readonly status: 'queued' | 'parts-needed' | 'in-progress' | 'done';
}

interface ISalvageBayItem {
  readonly partId: string;                  // from ISalvageCandidate
  readonly sourceUnitId: string;
  readonly designation: string;
  readonly recoveredValue: number;          // C-bills
  readonly disposition: 'mercenary' | 'employer';
  readonly status: 'pending' | 'accepted' | 'declined';
}

interface IMedicalBayItem {
  readonly pilotId: string;
  readonly pilotName: string;
  readonly injuryLevel: 'none' | 'light' | 'serious' | 'critical' | 'kia';
  readonly daysToRecover: number;
  readonly status: 'recovering' | 'ready' | 'discharged';
}

interface IInventorySummary {
  readonly repairTicketCount: number;
  readonly totalRepairHours: number;
  readonly salvageValueTotal: number;       // C-bills, mercenary share
  readonly pilotsInMedical: number;
}
```

Every field is read-only. `IRepairBayItem` is a projection of `IRepairTicket`,
`ISalvageBayItem` of `ISalvageCandidate`, `IMedicalBayItem` of the pilot's
campaign-roster injury state. CP2a renders this structure and may *not* alter
the schema; an inventory schema change requires its own change.

### D5. Inventory projection step

`projectCampaignInventory(campaign): ICampaignInventory` is a pure function that
reads `campaign.repairTickets`, `campaign.salvageAllocations`, and the roster's
pilot injury state and assembles `ICampaignInventory`. It runs in a
`CLEANUP`-phase processor after the battle-effects block has drained, so the
inventory always reflects post-battle state. The projection is derived and
recomputed each day — it is not an independently mutated store.

### D6. Campaign-linked launch path

When the player opens a generated encounter from a campaign, the launch creates
a `GameSession` via the existing `encounter-system` launch snapshot, then stamps
the session's campaign linkage (`campaignId`, `contractId`, `scenarioId`) using
the existing `Session Carries Campaign Linkage` requirement of
`game-session-management`. No new session-creation path — the campaign supplies
the linkage fields and reuses the encounter launch.

### D7. Automatic enqueue trigger

The campaign store already subscribes to `CombatOutcomeReady`. This change
narrows the handler: when the completing session carries campaign linkage, the
outcome is enqueued onto *that campaign's* `pendingBattleOutcomes`. A session
without campaign linkage (a standalone skirmish) is ignored, exactly as today.
The duplicate-by-`matchId` guard from the existing requirement is reused.

## Risks / Trade-offs

- **[Risk] A `scenario_generated` event is bridged twice** → Mitigation: the
  `bridgedScenarioIds` idempotency set (D3); a re-run skips known scenario ids.
- **[Risk] The inventory schema (D4) needs a field after CP2a starts** →
  Mitigation: the schema is frozen here and CP2a is forbidden from changing it;
  a genuine schema gap is a follow-up change, not silent drift. The schema was
  designed against the *existing* `IRepairTicket` / `ISalvageCandidate` fields,
  reducing the chance of a gap.
- **[Risk] Inventory projection runs before the battle-effects block drains** →
  Mitigation: the projection processor is phase `CLEANUP` (900), strictly after
  the `MISSIONS - 50/-25/-10` battle-effects block; the day pipeline's phase
  ordering guarantees it.
- **[Risk] OpFor force generated from `opForBV` only is too coarse** →
  Mitigation: this change scopes OpFor to a BV-matched force using the existing
  `opForGeneration` util; richer OpFor composition is out of scope and noted as
  an open question.

## Migration Plan

Purely additive. `scenarioGenerationProcessor` is untouched — the bridge is a
new consumer processor. The enqueue handler is narrowed but its existing
standalone-skirmish behavior is unchanged. The inventory projection is a new
derived structure; campaigns with no battles produce an empty
`ICampaignInventory`. No database migrations. Rollback = revert the change-set;
generated scenarios revert to being non-launchable day events as today.

## Open Questions

- OpFor composition fidelity — proposed: BV-matched force from `opForGeneration`
  for this change; richer composition (unit roles, lance structure) deferred.
- Whether the bridge should auto-launch the encounter or only persist it —
  proposed: persist only; the player chooses when to launch from CP2a/CP2b UI.
- Medical-bay injury source — proposed: read from the campaign-roster pilot
  injury state populated by `healingProcessor`; confirm the field name during
  implementation.
