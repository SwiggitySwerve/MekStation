import type { IAutoAwardConfig } from './awards/autoAwardTypes';

import { MedicalSystem } from '../../lib/campaign/medical/medicalTypes';
import { PersonnelMarketStyle } from './markets/marketTypes';

export type TurnoverFrequency =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'never';

export interface ICampaignOptions {
  readonly healingRateMultiplier: number;
  readonly salaryMultiplier: number;
  readonly retirementAge: number;
  readonly healingWaitingPeriod: number;
  readonly medicalSystem: MedicalSystem;
  readonly maxPatientsPerDoctor: number;
  readonly doctorsUseAdministration: boolean;
  readonly xpPerMission: number;
  readonly xpPerKill: number;
  readonly xpCostMultiplier: number;
  readonly trackTimeInService: boolean;
  readonly useEdge: boolean;

  readonly scenarioXP?: number;
  readonly killXPAward?: number;
  readonly killsForXP?: number;
  readonly taskXP?: number;
  readonly nTasksXP?: number;
  readonly vocationalXP?: number;
  readonly vocationalXPTargetNumber?: number;
  readonly vocationalXPCheckFrequency?: number;
  readonly adminXP?: number;
  readonly adminXPPeriod?: number;
  readonly missionFailXP?: number;
  readonly missionSuccessXP?: number;
  readonly missionOutstandingXP?: number;
  readonly useAgingEffects?: boolean;

  readonly startingFunds: number;
  readonly maintenanceCostMultiplier: number;
  readonly repairCostMultiplier: number;
  readonly acquisitionCostMultiplier: number;
  readonly payForMaintenance: boolean;
  readonly payForRepairs: boolean;
  readonly payForSalaries: boolean;
  readonly payForAmmunition: boolean;
  readonly maintenanceCycleDays: number;
  readonly useLoanSystem: boolean;
  readonly useTaxes: boolean;
  readonly taxRate: number;
  readonly overheadPercent: number;
  readonly useRoleBasedSalaries: boolean;
  readonly payForSecondaryRole: boolean;
  readonly maxLoanPercent: number;
  readonly defaultLoanRate: number;
  readonly taxFrequency: 'monthly' | 'quarterly' | 'annually';
  readonly useFoodAndHousing: boolean;
  readonly clanPriceMultiplier: number;
  readonly mixedTechPriceMultiplier: number;
  readonly usedEquipmentMultiplier: number;
  readonly damagedEquipmentMultiplier: number;

  readonly useAutoResolve: boolean;
  readonly autoResolveCasualtyRate: number;
  readonly allowPilotCapture: boolean;
  readonly useRandomInjuries: boolean;
  readonly pilotDeathChance: number;
  readonly autoEject: boolean;
  readonly trackAmmunition: boolean;
  readonly useQuirks: boolean;
  readonly useAtBScenarios?: boolean;
  readonly difficultyMultiplier?: number;

  readonly maxUnitsPerLance: number;
  readonly maxLancesPerCompany: number;
  readonly enforceFormationRules: boolean;
  readonly allowMixedFormations: boolean;
  readonly requireForceCommanders: boolean;
  readonly useCombatTeams: boolean;

  readonly dateFormat: string;
  readonly useFactionRules: boolean;
  readonly techLevel: number;

  readonly useAcquisitionSystem?: boolean;
  readonly usePlanetaryModifiers?: boolean;
  readonly acquisitionTransitUnit?: 'day' | 'week' | 'month';
  readonly clanPartsPenalty?: boolean;

  readonly limitByYear: boolean;
  readonly allowClanEquipment: boolean;
  readonly useRandomEvents: boolean;
  readonly usePrisonerEvents?: boolean;
  readonly useLifeEvents?: boolean;
  readonly useContractEvents?: boolean;
  readonly simulateGrayMonday?: boolean;
  readonly enableDayReportNotifications: boolean;

  readonly useTurnover: boolean;
  readonly turnoverFixedTargetNumber: number;
  readonly turnoverCheckFrequency: TurnoverFrequency;
  readonly turnoverCommanderImmune: boolean;
  readonly turnoverPayoutMultiplier: number;
  readonly turnoverUseSkillModifiers: boolean;
  readonly turnoverUseAgeModifiers: boolean;
  readonly turnoverUseMissionStatusModifiers: boolean;

  readonly trackFactionStanding: boolean;
  readonly regardChangeMultiplier: number;

  readonly autoAwardConfig?: IAutoAwardConfig;

  readonly rankSystemCode?: string;

  readonly unitMarketMethod?: 'none' | 'atb_monthly';
  readonly personnelMarketStyle?: PersonnelMarketStyle;
  readonly contractMarketMethod?: 'none' | 'atb_monthly' | 'cam_ops';
}
