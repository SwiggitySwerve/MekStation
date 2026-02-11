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
 */

import { ICampaign } from '@/types/campaign/Campaign';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { getAllUnits } from '@/types/campaign/Force';
import { IContract, isContract, IMission } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { IPerson, IInjury } from '@/types/campaign/Person';
import { Transaction } from '@/types/campaign/Transaction';

import { IDayPipelineResult, IDayEvent } from './dayPipeline';
import { getBestAvailableDoctor } from './medical/doctorCapacity';
import { MedicalSystem } from './medical/medicalTypes';
import { performMedicalCheck } from './medical/performMedicalCheck';

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
 * Process healing for all personnel in the campaign.
 *
 * For each wounded person:
 * - Use selected medical system (standard/advanced/alternate) to process injuries
 * - Apply medical check results to reduce healing time
 * - Remove injuries where daysToHeal reaches 0
 * - Reduce daysToWaitForHealing by 1 (min 0)
 * - If person is WOUNDED and all injuries healed + daysToWaitForHealing is 0,
 *   transition to ACTIVE
 *
 * @param personnel - Map of all personnel
 * @param campaign - Campaign with options and personnel for doctor assignment
 * @returns Updated personnel map and healing events
 */
export function processHealing(
  personnel: Map<string, IPerson>,
  campaign?: ICampaign,
): {
  personnel: Map<string, IPerson>;
  events: HealedPersonEvent[];
} {
  const updatedPersonnel = new Map<string, IPerson>();
  const events: HealedPersonEvent[] = [];

  // Get medical system from campaign options, default to STANDARD
  const medicalSystem =
    campaign?.options.medicalSystem ?? MedicalSystem.STANDARD;
  const personnelArray = Array.from(personnel.values());

  Array.from(personnel.entries()).forEach(([id, person]) => {
    // Only process healing for wounded personnel
    if (person.status !== PersonnelStatus.WOUNDED) {
      updatedPersonnel.set(id, person);
      return;
    }

    // Process injuries: apply medical checks, track healed ones
    const healedInjuryIds: string[] = [];
    const updatedInjuries: IInjury[] = [];

    person.injuries.forEach((injury) => {
      if (injury.permanent) {
        // Permanent injuries don't heal
        updatedInjuries.push(injury);
        return;
      }

      // Get assigned doctor for this patient
      const doctor = campaign
        ? getBestAvailableDoctor(person, personnelArray, campaign.options)
        : null;

      // Perform medical check using selected system
      const medicalResult = campaign
        ? performMedicalCheck(
            medicalSystem,
            person,
            injury,
            doctor,
            campaign.options,
            Math.random,
          )
        : null;

      // Calculate healing days reduced
      const daysReduced = medicalResult?.healingDaysReduced ?? 1;
      const newDaysToHeal = Math.max(0, injury.daysToHeal - daysReduced);

      if (newDaysToHeal === 0) {
        // Injury fully healed - don't include in updated list
        healedInjuryIds.push(injury.id);
      } else {
        updatedInjuries.push({
          ...injury,
          daysToHeal: newDaysToHeal,
        });
      }
    });

    // Reduce daysToWaitForHealing
    const newDaysToWait = Math.max(0, person.daysToWaitForHealing - 1);

    // Check if person should return to active duty
    const hasHealableInjuries = updatedInjuries.some((i) => !i.permanent);
    const fullyHealed = !hasHealableInjuries && newDaysToWait === 0;
    const returnedToActive =
      fullyHealed && person.status === PersonnelStatus.WOUNDED;

    const updatedPerson: IPerson = {
      ...person,
      injuries: updatedInjuries,
      daysToWaitForHealing: newDaysToWait,
      status: returnedToActive ? PersonnelStatus.ACTIVE : person.status,
      updatedAt: new Date().toISOString(),
    };

    updatedPersonnel.set(id, updatedPerson);

    // Record event if anything notable happened
    if (healedInjuryIds.length > 0 || returnedToActive) {
      events.push({
        personId: id,
        personName: person.name,
        healedInjuries: healedInjuryIds,
        returnedToActive,
      });
    }
  });

  return { personnel: updatedPersonnel, events };
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

  // Count active personnel for salary
  const activePersonnel = Array.from(campaign.personnel.values()).filter(
    (p) =>
      p.status !== PersonnelStatus.KIA &&
      p.status !== PersonnelStatus.RETIRED &&
      p.status !== PersonnelStatus.DESERTED,
  );
  const personnelCount = activePersonnel.length;

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
 * 1. Personnel healing
 * 2. Contract expiration
 * 3. Daily costs (salaries + maintenance)
 * 4. Advance the date by one day
 *
 * Returns a DayReport with all events and the updated campaign.
 *
 * @param campaign - The campaign to advance
 * @returns DayReport with events and updated campaign
 *
 * @example
 * const report = advanceDay(campaign);
 * logger.debug(`${report.healedPersonnel.length} personnel healed`);
 * logger.debug(`${report.expiredContracts.length} contracts expired`);
 * logger.debug(`Daily costs: ${report.costs.total.format()}`);
 * // Use report.campaign for the updated state
 */
export function advanceDay(campaign: ICampaign): DayReport {
  const processedDate = campaign.currentDate;

  // 1. Process healing
  const healingResult = processHealing(campaign.personnel);

  // 2. Process contracts (use campaign with updated personnel)
  const campaignWithHealing: ICampaign = {
    ...campaign,
    personnel: healingResult.personnel,
  };
  const contractResult = processContracts(campaignWithHealing);

  // 3. Process daily costs (use campaign with updated personnel + contracts)
  const campaignWithContracts: ICampaign = {
    ...campaignWithHealing,
    missions: contractResult.missions,
  };
  const costResult = processDailyCosts(campaignWithContracts);

  // 4. Advance the date by one day
  const nextDate = new Date(processedDate.getTime() + 24 * 60 * 60 * 1000);

  // Build the final updated campaign
  const updatedCampaign: ICampaign = {
    ...campaign,
    currentDate: nextDate,
    personnel: healingResult.personnel,
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

// Helper to safely cast event data to specific types
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function castEventData<T>(data: any): T {
  return data as T;
}

export function convertToLegacyDayReport(
  result: IDayPipelineResult,
): DayReport {
  const healedPersonnel: HealedPersonEvent[] = result.events
    .filter((e: IDayEvent) => e.type === 'healing')
    .map((e: IDayEvent) => castEventData<HealedPersonEvent>(e.data));

  const expiredContracts: ExpiredContractEvent[] = result.events
    .filter((e: IDayEvent) => e.type === 'contract_expired')
    .map((e: IDayEvent) => castEventData<ExpiredContractEvent>(e.data));

  const costEvent = result.events.find(
    (e: IDayEvent) => e.type === 'daily_costs',
  );
  const costs: DailyCostBreakdown = costEvent?.data
    ? castEventData<DailyCostBreakdown>(costEvent.data)
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
