/**
 * Day Advancement - Processes daily campaign progression
 *
 * Handles the passage of one day in the campaign:
 * - Personnel healing (reduce injury days, clear healed injuries)
 * - Contract expiration (check end dates, update statuses)
 * - Daily costs (salaries per person, maintenance per unit)
 *
 * Returns a DayReport summarizing all events that occurred.
 *
 * Based on MekHQ's daily advancement loop, simplified for MVP.
 *
 * @module lib/campaign/dayAdvancement
 *
 * # Pipeline Order (Wave 5 / `wire-encounter-to-campaign-round-trip`)
 *
 * The legacy `advanceDay` in this file is a fallback for code paths that
 * don't go through the registry pipeline. The campaign store
 * (`useCampaignStore.advanceDay`) routes through `advanceDayViaPipeline`
 * and the `DayPipelineRegistry`. The canonical order — sorted by each
 * processor's `phase` value — is:
 *
 *   1. healingProcessor            (PERSONNEL = 100)
 *   2. postBattleProcessor         (MISSIONS - 50 = 350)
 *   3. salvageProcessor            (MISSIONS - 25 = 375)
 *   4. repairQueueBuilderProcessor (MISSIONS - 10 = 390)
 *   5. contractProcessor           (MISSIONS = 400)
 *   6. dailyCostsProcessor         (FINANCES = 700)
 *   7. randomEventsProcessor / market processors (EVENTS = 800)
 *
 * The post-battle → salvage → repair → contract chain (#2–#5) is the
 * Wave 5 invariant: each step consumes the previous step's output, and
 * contract closure logic depends on all three battle-effects processors
 * having completed.
 *
 * # PR3 Dependency Map — Processor cross-read audit (task 4.1)
 *
 * Each processor in the `DayPipelineRegistry` pipeline receives the
 * previous processor's output `ICampaign` as its input. The READ side of
 * `campaign.personnel` within each processor operates on the snapshot
 * handed in — no processor reads state that a *prior* processor wrote
 * into `campaign.personnel` for that processor's own read-phase logic.
 * Concretely:
 *
 *   healingProcessor (phase 100)
 *     READ : iterates `campaign.personnel` for wounded entries.
 *     WRITE: returns spread with updated `personnel` map.
 *     DEPENDENCY ON PRIOR: none — first personnel-phase processor.
 *
 *   postBattleProcessor (phase 350)
 *     READ : `campaign.personnel` for pilot XP + wound updates.
 *     WRITE: returns spread with updated `personnel` map.
 *     DEPENDENCY ON PRIOR: reads `campaign.pendingBattleOutcomes` (not
 *       from personnel writes). Healing results in `campaign.personnel`
 *       are incidentally present but the XP/wound logic is additive and
 *       does NOT branch on healing state. Safe to treat as independent.
 *
 *   vocationalTrainingProcessor (phase 800)
 *     READ : `campaign.personnel` for timer + eligibility.
 *     WRITE: returns spread with updated `personnel` map (timers + XP).
 *     DEPENDENCY ON PRIOR: none — eligibility is `ACTIVE` status only,
 *       which healing may have changed (WOUNDED → ACTIVE). This is
 *       intentional and desirable (newly-healed staff earn training).
 *       No dependency on what postBattle wrote.
 *
 *   autoAwardsProcessor (phase 100, same as healing but distinct ID)
 *     READ : `campaign.personnel` for award eligibility.
 *     WRITE: returns spread with updated `personnel` map (awards array).
 *     DEPENDENCY ON PRIOR: none — award checks look at kills/missions
 *       counters, not wound state or XP. Independent of healing.
 *
 *   turnoverProcessor (phase 100)
 *     READ : already reads from `useCampaignRosterStore` + `usePilotStore`
 *       (PR2 complete). No `campaign.personnel` read on the READ side.
 *     WRITE: returns spread with updated `personnel` map (departure status).
 *     DEPENDENCY ON PRIOR: none.
 *
 *   randomEventsProcessor (phase 800)
 *     READ : `campaign.personnel` for entry synthesis (life/prisoner events).
 *     WRITE: does NOT write `campaign.personnel` — returns unchanged campaign.
 *     DEPENDENCY ON PRIOR: none — read is additive event generation only.
 *
 * CONCLUSION: No processor N reads state written into `campaign.personnel`
 * by processor N-1 as a precondition for its own read-phase logic. The
 * atomic repointing in PR3 can pre-build `(entries, pilotsByPilotId)` from
 * stores once per processor's `process()` call without correctness risk.
 * Each processor calls `useCampaignRosterStore.getState().pilots` and
 * `buildPilotLookup(usePilotStore.getState().pilots)` independently, which
 * is consistent with the `turnoverProcessor` pattern proven in PR2.
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { ICampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { getAllUnits } from '@/types/campaign/Force';
import { IContract, isContract, IMission } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { IInjury } from '@/types/campaign/Person';
import { Transaction } from '@/types/campaign/Transaction';

import { IDayPipelineResult, IDayEvent } from './dayPipeline';
import { getBestAvailableDoctor } from './medical/doctorCapacity';
import { MedicalSystem } from './medical/medicalTypes';
import { performMedicalCheck } from './medical/performMedicalCheck';
import { asEventDataShape } from './utils/processorHelpers';

// =============================================================================
// Constants
// =============================================================================

/** Default daily salary per person in C-bills */
export const DEFAULT_DAILY_SALARY = 50;

/** Default daily maintenance cost per unit in C-bills */
export const DEFAULT_DAILY_MAINTENANCE = 100;

// =============================================================================
// Report Types
// =============================================================================

/**
 * Event describing a person who completed healing.
 */
export interface HealedPersonEvent {
  /** Person ID */
  readonly personId: string;
  /** Person name */
  readonly personName: string;
  /** Injuries that were fully healed this day */
  readonly healedInjuries: readonly string[];
  /** Whether the person transitioned from WOUNDED to ACTIVE */
  readonly returnedToActive: boolean;
}

/**
 * Event describing a contract that expired.
 */
export interface ExpiredContractEvent {
  /** Contract ID */
  readonly contractId: string;
  /** Contract name */
  readonly contractName: string;
  /** Previous status */
  readonly previousStatus: MissionStatus;
  /** New status after expiration */
  readonly newStatus: MissionStatus;
}

/**
 * Breakdown of daily costs.
 */
export interface DailyCostBreakdown {
  /** Total salary costs */
  readonly salaries: Money;
  /** Total maintenance costs */
  readonly maintenance: Money;
  /** Total daily costs */
  readonly total: Money;
  /** Number of personnel paid */
  readonly personnelCount: number;
  /** Number of units maintained */
  readonly unitCount: number;
}

/**
 * Report summarizing all events from a single day advancement.
 */
export interface TurnoverDepartureEvent {
  readonly personId: string;
  readonly personName: string;
  readonly departureType: 'retired' | 'deserted';
  readonly roll: number;
  readonly targetNumber: number;
  readonly payoutAmount: number;
  readonly modifiers: readonly {
    modifierId: string;
    displayName: string;
    value: number;
    isStub: boolean;
  }[];
}

export interface DayReport {
  readonly date: Date;
  readonly healedPersonnel: readonly HealedPersonEvent[];
  readonly expiredContracts: readonly ExpiredContractEvent[];
  readonly costs: DailyCostBreakdown;
  readonly turnoverDepartures: readonly TurnoverDepartureEvent[];
  readonly campaign: ICampaign;
}

// =============================================================================
// Healing Processing
// =============================================================================

/**
 * Process healing for all wounded roster entries.
 *
 * Per PR4 of `wire-iperson-hard-cutover`: this legacy function reads roster
 * entries directly (no personnel Map) and returns per-pilot patches that
 * the caller commits via `useCampaignRosterStore.applyPilotPatches`.
 * Production uses `healingProcessor` via the DayPipelineRegistry; this
 * standalone function is a thin wrapper kept for the `advanceDay` legacy
 * path and direct unit tests.
 *
 * For each wounded entry:
 * - Use selected medical system to process injuries
 * - Apply medical check results to reduce healing time
 * - Remove injuries where daysToHeal reaches 0
 * - Reduce recoveryTime by 1 (min 0)
 * - If entry is Wounded and all injuries healed + recoveryTime is 0,
 *   transition to Active
 *
 * @param entries - All roster entries (typically `useCampaignRosterStore.getState().pilots`)
 * @param campaign - Campaign with options for doctor assignment
 * @returns Per-pilot patches plus healing events
 */
export function processHealing(
  entries: readonly ICampaignRosterEntry[],
  campaign?: ICampaign,
): {
  patches: Map<string, Partial<ICampaignRosterEntry>>;
  events: HealedPersonEvent[];
} {
  const patches = new Map<string, Partial<ICampaignRosterEntry>>();
  const events: HealedPersonEvent[] = [];

  const medicalSystem =
    campaign?.options.medicalSystem ?? MedicalSystem.STANDARD;
  // Doctor lookup uses ALL entries (for primaryRole=DOCTOR filtering).
  // No vault join in this legacy path — pass empty pilot map (NPCs only).
  const emptyPilots: ReadonlyMap<string, IPilot> = new Map<string, IPilot>();

  for (const entry of entries) {
    if (entry.status !== CampaignPilotStatus.Wounded) continue;

    // Process injuries: apply medical checks, track healed ones
    const healedInjuryIds: string[] = [];
    const updatedInjuries: IInjury[] = [];
    const injuries: readonly IInjury[] = entry.injuries ?? [];

    for (const injury of injuries) {
      if (injury.permanent) {
        // Permanent injuries don't heal
        updatedInjuries.push(injury);
        continue;
      }

      // Get assigned doctor for this patient using new two-arg signature
      const doctorEntry = campaign
        ? getBestAvailableDoctor(entry, entries, emptyPilots, campaign.options)
        : null;

      // Perform medical check using selected system with new two-arg signature
      const medicalResult = campaign
        ? performMedicalCheck(
            medicalSystem,
            entry,
            injury,
            doctorEntry,
            null, // doctorPilot: no vault join in this legacy path
            campaign.options,
            Math.random,
          )
        : null;

      const daysReduced = medicalResult?.healingDaysReduced ?? 1;
      const newDaysToHeal = Math.max(0, injury.daysToHeal - daysReduced);

      if (newDaysToHeal === 0) {
        healedInjuryIds.push(injury.id);
      } else {
        updatedInjuries.push({ ...injury, daysToHeal: newDaysToHeal });
      }
    }

    // Reduce recoveryTime (the roster-entry recovery counter)
    const oldRecoveryTime = entry.recoveryTime ?? 0;
    const newRecoveryTime = Math.max(0, oldRecoveryTime - 1);

    // Check if entry should return to active duty
    const hasHealableInjuries = updatedInjuries.some((i) => !i.permanent);
    const returnedToActive = !hasHealableInjuries && newRecoveryTime === 0;

    // Commit a patch when ANY field changes — recoveryTime decrements
    // even when no injury cleared, so the early-return must consider
    // the recoveryTime delta too. Otherwise wounded pilots would never
    // tick down their recovery clock.
    const recoveryChanged = newRecoveryTime !== oldRecoveryTime;
    const injuriesChanged = healedInjuryIds.length > 0;
    if (!injuriesChanged && !returnedToActive && !recoveryChanged) {
      continue;
    }

    patches.set(entry.pilotId, {
      injuries: updatedInjuries,
      recoveryTime: newRecoveryTime,
      status: returnedToActive ? CampaignPilotStatus.Active : entry.status,
    });

    // Only emit a healing event when something user-visible happened
    // (injury cleared OR returned to active). A silent recovery-time
    // tick stays internal to keep the event log noise-free.
    if (injuriesChanged || returnedToActive) {
      events.push({
        personId: entry.pilotId,
        personName: entry.pilotName,
        healedInjuries: healedInjuryIds,
        returnedToActive,
      });
    }
  }

  return { patches, events };
}

// =============================================================================
// Contract Processing
// =============================================================================

/**
 * Process contract expiration for the campaign.
 *
 * Checks all active contracts against the current date.
 * If a contract's endDate has passed, it is marked as completed (SUCCESS).
 *
 * @param campaign - The campaign to process
 * @returns Updated missions map and expiration events
 */
export function processContracts(campaign: ICampaign): {
  missions: Map<string, IMission>;
  events: ExpiredContractEvent[];
} {
  const updatedMissions = new Map(campaign.missions);
  const events: ExpiredContractEvent[] = [];
  const currentDate = campaign.currentDate;

  Array.from(campaign.missions.entries()).forEach(([id, mission]) => {
    // Only process active contracts with end dates
    if (!isContract(mission)) return;
    if (mission.status !== MissionStatus.ACTIVE) return;
    if (!mission.endDate) return;

    const endDate = new Date(mission.endDate);
    if (currentDate >= endDate) {
      const updatedContract: IContract = {
        ...mission,
        status: MissionStatus.SUCCESS,
        updatedAt: new Date().toISOString(),
      };

      updatedMissions.set(id, updatedContract);

      events.push({
        contractId: id,
        contractName: mission.name,
        previousStatus: mission.status,
        newStatus: MissionStatus.SUCCESS,
      });
    }
  });

  return { missions: updatedMissions, events };
}

// =============================================================================
// Daily Costs Processing
// =============================================================================

/**
 * Process daily costs for the campaign.
 *
 * Calculates:
 * - Salary: DEFAULT_DAILY_SALARY * salaryMultiplier per active person
 * - Maintenance: DEFAULT_DAILY_MAINTENANCE * maintenanceCostMultiplier per unit
 *
 * Deducts from campaign balance and records transactions.
 *
 * @param campaign - The campaign to process
 * @returns Updated finances and cost breakdown
 */
export function processDailyCosts(campaign: ICampaign): {
  finances: { transactions: Transaction[]; balance: Money };
  costs: DailyCostBreakdown;
} {
  const { options } = campaign;
  const newTransactions: Transaction[] = [...campaign.finances.transactions];
  let currentBalance = campaign.finances.balance;

  // Count billable personnel for salary — read from roster store
  // (canonical source per PR4 of `wire-iperson-hard-cutover`).
  // CampaignPilotStatus.KIA is the only non-billable terminal status; Active,
  // Wounded, Critical, and MIA all still draw salary.
  const rosterEntries = useCampaignRosterStore.getState().pilots;
  const personnelCount = rosterEntries.filter(
    (e) => e.status !== CampaignPilotStatus.KIA,
  ).length;

  // Calculate salary costs
  let salaries = Money.ZERO;
  if (options.payForSalaries && personnelCount > 0) {
    const dailySalaryPerPerson = new Money(
      DEFAULT_DAILY_SALARY * options.salaryMultiplier,
    );
    salaries = dailySalaryPerPerson.multiply(personnelCount);

    newTransactions.push({
      id: `tx-salary-${campaign.currentDate.toISOString()}`,
      type: TransactionType.Expense,
      amount: salaries,
      date: campaign.currentDate,
      description: `Daily salaries for ${personnelCount} personnel`,
    });

    currentBalance = currentBalance.subtract(salaries);
  }

  // Count units for maintenance
  let unitCount = 0;
  const rootForce = campaign.forces.get(campaign.rootForceId);
  if (rootForce) {
    const allUnitIds = getAllUnits(rootForce, campaign.forces);
    unitCount = allUnitIds.length;
  }

  // Calculate maintenance costs
  let maintenance = Money.ZERO;
  if (options.payForMaintenance && unitCount > 0) {
    const dailyMaintenancePerUnit = new Money(
      DEFAULT_DAILY_MAINTENANCE * options.maintenanceCostMultiplier,
    );
    maintenance = dailyMaintenancePerUnit.multiply(unitCount);

    newTransactions.push({
      id: `tx-maintenance-${campaign.currentDate.toISOString()}`,
      type: TransactionType.Maintenance,
      amount: maintenance,
      date: campaign.currentDate,
      description: `Daily maintenance for ${unitCount} units`,
    });

    currentBalance = currentBalance.subtract(maintenance);
  }

  const total = salaries.add(maintenance);

  return {
    finances: {
      transactions: newTransactions,
      balance: currentBalance,
    },
    costs: {
      salaries,
      maintenance,
      total,
      personnelCount,
      unitCount,
    },
  };
}

// =============================================================================
// Main Day Advancement
// =============================================================================

/**
 * Advance the campaign by one day.
 *
 * Processes in order:
 * 1. Personnel healing (commits patches to roster store)
 * 2. Contract expiration
 * 3. Daily costs (salaries + maintenance)
 * 4. Advance the date by one day
 *
 * Per PR4 of `wire-iperson-hard-cutover`: roster mutations go through
 * `useCampaignRosterStore.applyPilotPatches`. The returned `DayReport`
 * carries the events; callers read updated roster state from the store.
 *
 * @param campaign - The campaign to advance
 * @returns DayReport with events and updated campaign
 */
export function advanceDay(campaign: ICampaign): DayReport {
  const processedDate = campaign.currentDate;

  // 1. Process healing — read entries from store, commit patches back.
  const rosterEntries = useCampaignRosterStore.getState().pilots;
  const healingResult = processHealing(rosterEntries, campaign);
  if (healingResult.patches.size > 0) {
    useCampaignRosterStore.getState().applyPilotPatches(healingResult.patches);
  }

  // 2. Process contracts
  const contractResult = processContracts(campaign);

  // 3. Process daily costs — reads roster store directly for personnel count.
  const campaignWithContracts: ICampaign = {
    ...campaign,
    missions: contractResult.missions,
  };
  const costResult = processDailyCosts(campaignWithContracts);

  // 4. Advance the date by one day
  const nextDate = new Date(processedDate.getTime() + 24 * 60 * 60 * 1000);

  const updatedCampaign: ICampaign = {
    ...campaign,
    currentDate: nextDate,
    missions: contractResult.missions,
    finances: costResult.finances,
    updatedAt: new Date().toISOString(),
  };

  return {
    date: processedDate,
    healedPersonnel: healingResult.events,
    expiredContracts: contractResult.events,
    costs: costResult.costs,
    turnoverDepartures: [],
    campaign: updatedCampaign,
  };
}

// =============================================================================
// Multi-Day Advancement
// =============================================================================

export function advanceDays(campaign: ICampaign, count: number): DayReport[] {
  const reports: DayReport[] = [];
  let currentCampaign = campaign;

  for (let i = 0; i < count; i++) {
    const report = advanceDay(currentCampaign);
    reports.push(report);
    currentCampaign = report.campaign;
  }

  return reports;
}

// =============================================================================
// Pipeline Integration
// =============================================================================

export function convertToLegacyDayReport(
  result: IDayPipelineResult,
): DayReport {
  const healedPersonnel: HealedPersonEvent[] = result.events
    .filter((e: IDayEvent) => e.type === 'healing')
    .map((e: IDayEvent) => asEventDataShape<HealedPersonEvent>(e.data));

  const expiredContracts: ExpiredContractEvent[] = result.events
    .filter((e: IDayEvent) => e.type === 'contract_expired')
    .map((e: IDayEvent) => asEventDataShape<ExpiredContractEvent>(e.data));

  const costEvent = result.events.find(
    (e: IDayEvent) => e.type === 'daily_costs',
  );
  const costs: DailyCostBreakdown = costEvent?.data
    ? asEventDataShape<DailyCostBreakdown>(costEvent.data)
    : {
        salaries: Money.ZERO,
        maintenance: Money.ZERO,
        total: Money.ZERO,
        personnelCount: 0,
        unitCount: 0,
      };

  const turnoverDepartures: TurnoverDepartureEvent[] = result.events
    .filter((e: IDayEvent) => e.type === 'turnover_departure')
    .map((e: IDayEvent) => {
      const data = e.data as Record<string, unknown>;
      return {
        personId: data.personId as string,
        personName: data.personName as string,
        departureType: data.departureType as 'retired' | 'deserted',
        roll: data.roll as number,
        targetNumber: data.targetNumber as number,
        payoutAmount: data.payout as number,
        modifiers:
          (data.modifiers as TurnoverDepartureEvent['modifiers']) ?? [],
      };
    });

  return {
    date: result.date,
    healedPersonnel,
    expiredContracts,
    costs,
    turnoverDepartures,
    campaign: result.campaign,
  };
}

export function advanceDayViaPipeline(
  campaign: ICampaign,
  pipeline: { processDay(campaign: ICampaign): IDayPipelineResult },
): DayReport {
  const result = pipeline.processDay(campaign);
  return convertToLegacyDayReport(result);
}
