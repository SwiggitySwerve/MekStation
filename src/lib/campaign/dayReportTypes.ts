/**
 * Day Report Types - Shared types and constants for day advancement
 *
 * Holds the event/report interfaces and cost constants consumed by the
 * day-advancement processor chain. Extracted from `dayAdvancement.ts`
 * (decompose refactor) so that the individual phase modules and the
 * pipeline coordinator can depend on a single, dependency-light type
 * module rather than on the coordinator file itself.
 *
 * @module lib/campaign/dayReportTypes
 */

import { ICampaign } from '@/types/campaign/Campaign';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';

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
  /**
   * Summed daily repayment of all active campaign loans (CP2b —
   * `add-campaign-command-ui`, design D4). Zero when the campaign has
   * no active loans. Included in `total`.
   */
  readonly loanRepayment: Money;
  /** Total daily costs */
  readonly total: Money;
  /** Number of personnel paid */
  readonly personnelCount: number;
  /** Number of units maintained */
  readonly unitCount: number;
}

/**
 * Event describing a person who departed the campaign via turnover
 * (retirement or desertion).
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

/**
 * Report summarizing all events from a single day advancement.
 */
export interface DayReport {
  readonly date: Date;
  readonly healedPersonnel: readonly HealedPersonEvent[];
  readonly expiredContracts: readonly ExpiredContractEvent[];
  readonly costs: DailyCostBreakdown;
  readonly turnoverDepartures: readonly TurnoverDepartureEvent[];
  readonly campaign: ICampaign;
}
