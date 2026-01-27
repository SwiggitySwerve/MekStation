import type { ICampaignOptions } from './Campaign';
import { createDefaultCampaignOptions } from './Campaign';
import { MedicalSystem } from '../../lib/campaign/medical/medicalTypes';
import { PersonnelMarketStyle } from './markets/marketTypes';

export enum OptionGroupId {
  GENERAL = 'general',
  PERSONNEL = 'personnel',
  XP_PROGRESSION = 'xp_progression',
  TURNOVER = 'turnover',
  FINANCIAL = 'financial',
  REPAIR_MAINTENANCE = 'repair_maintenance',
  COMBAT = 'combat',
  FORCE_ORGANIZATION = 'force',
  MEDICAL = 'medical',
  FACTION_STANDING = 'faction',
  MARKETS = 'markets',
  EVENTS = 'events',
  ADVANCED = 'advanced',
}

export interface ICampaignOptionMeta {
  readonly key: keyof ICampaignOptions;
  readonly group: OptionGroupId;
  readonly label: string;
  readonly description: string;
  readonly type: 'boolean' | 'number' | 'string' | 'enum';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly enumValues?: readonly string[];
  readonly defaultValue: unknown;
  readonly requiresSystem?: string;
}

const defaults = createDefaultCampaignOptions();

export const OPTION_META: Record<string, ICampaignOptionMeta> = {
  // =========================================================================
  // Personnel
  // =========================================================================
  healingRateMultiplier: {
    key: 'healingRateMultiplier', group: OptionGroupId.PERSONNEL,
    label: 'Healing Rate Multiplier', description: 'Multiplier for natural healing rate (1.0 = normal)',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.healingRateMultiplier,
  },
  salaryMultiplier: {
    key: 'salaryMultiplier', group: OptionGroupId.PERSONNEL,
    label: 'Salary Multiplier', description: 'Multiplier for all salaries (1.0 = normal)',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.salaryMultiplier,
  },
  retirementAge: {
    key: 'retirementAge', group: OptionGroupId.PERSONNEL,
    label: 'Retirement Age', description: 'Age at which personnel may retire',
    type: 'number', min: 1, max: 120, step: 1, defaultValue: defaults.retirementAge,
  },
  healingWaitingPeriod: {
    key: 'healingWaitingPeriod', group: OptionGroupId.PERSONNEL,
    label: 'Healing Waiting Period', description: 'Days to wait between healing checks',
    type: 'number', min: 0, max: 30, step: 1, defaultValue: defaults.healingWaitingPeriod,
  },
  medicalSystem: {
    key: 'medicalSystem', group: OptionGroupId.MEDICAL,
    label: 'Medical System', description: 'Medical system to use',
    type: 'enum', enumValues: Object.values(MedicalSystem), defaultValue: defaults.medicalSystem,
  },
  maxPatientsPerDoctor: {
    key: 'maxPatientsPerDoctor', group: OptionGroupId.MEDICAL,
    label: 'Max Patients Per Doctor', description: 'Maximum patients per doctor',
    type: 'number', min: 1, max: 100, step: 1, defaultValue: defaults.maxPatientsPerDoctor,
  },
  doctorsUseAdministration: {
    key: 'doctorsUseAdministration', group: OptionGroupId.MEDICAL,
    label: 'Doctors Use Administration', description: 'Whether doctors use administration skill to increase capacity',
    type: 'boolean', defaultValue: defaults.doctorsUseAdministration,
  },
  xpPerMission: {
    key: 'xpPerMission', group: OptionGroupId.PERSONNEL,
    label: 'XP Per Mission', description: 'XP awarded per mission',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.xpPerMission,
  },
  xpPerKill: {
    key: 'xpPerKill', group: OptionGroupId.PERSONNEL,
    label: 'XP Per Kill', description: 'XP awarded per kill',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.xpPerKill,
  },
  xpCostMultiplier: {
    key: 'xpCostMultiplier', group: OptionGroupId.PERSONNEL,
    label: 'XP Cost Multiplier', description: 'Multiplier for skill improvement XP costs (1.0 = normal)',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.xpCostMultiplier,
  },
  trackTimeInService: {
    key: 'trackTimeInService', group: OptionGroupId.PERSONNEL,
    label: 'Track Time In Service', description: 'Whether to track time in service',
    type: 'boolean', defaultValue: defaults.trackTimeInService,
  },
  useEdge: {
    key: 'useEdge', group: OptionGroupId.PERSONNEL,
    label: 'Use Edge', description: 'Whether to use edge points',
    type: 'boolean', defaultValue: defaults.useEdge,
  },

  // =========================================================================
  // XP Progression
  // =========================================================================
  scenarioXP: {
    key: 'scenarioXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Scenario XP', description: 'XP awarded per scenario participation',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.scenarioXP,
  },
  killXPAward: {
    key: 'killXPAward', group: OptionGroupId.XP_PROGRESSION,
    label: 'Kill XP Award', description: 'XP awarded per kill',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.killXPAward,
  },
  killsForXP: {
    key: 'killsForXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Kills For XP', description: 'Number of kills required to earn kill XP award',
    type: 'number', min: 1, max: 100, step: 1, defaultValue: defaults.killsForXP,
  },
  taskXP: {
    key: 'taskXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Task XP', description: 'XP awarded per task completion',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.taskXP,
  },
  nTasksXP: {
    key: 'nTasksXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Tasks For XP', description: 'Number of tasks required to earn task XP',
    type: 'number', min: 1, max: 100, step: 1, defaultValue: defaults.nTasksXP,
  },
  vocationalXP: {
    key: 'vocationalXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Vocational XP', description: 'XP awarded per successful vocational training check',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.vocationalXP,
  },
  vocationalXPTargetNumber: {
    key: 'vocationalXPTargetNumber', group: OptionGroupId.XP_PROGRESSION,
    label: 'Vocational XP Target Number', description: 'Target number for vocational training 2d6 roll',
    type: 'number', min: 2, max: 12, step: 1, defaultValue: defaults.vocationalXPTargetNumber,
  },
  vocationalXPCheckFrequency: {
    key: 'vocationalXPCheckFrequency', group: OptionGroupId.XP_PROGRESSION,
    label: 'Vocational XP Check Frequency', description: 'Days between vocational training checks',
    type: 'number', min: 1, max: 365, step: 1, defaultValue: defaults.vocationalXPCheckFrequency,
  },
  adminXP: {
    key: 'adminXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Admin XP', description: 'XP awarded for administrative duties',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.adminXP,
  },
  adminXPPeriod: {
    key: 'adminXPPeriod', group: OptionGroupId.XP_PROGRESSION,
    label: 'Admin XP Period', description: 'Days between admin XP awards',
    type: 'number', min: 1, max: 365, step: 1, defaultValue: defaults.adminXPPeriod,
  },
  missionFailXP: {
    key: 'missionFailXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Mission Fail XP', description: 'XP awarded for mission failure',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.missionFailXP,
  },
  missionSuccessXP: {
    key: 'missionSuccessXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Mission Success XP', description: 'XP awarded for mission success',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.missionSuccessXP,
  },
  missionOutstandingXP: {
    key: 'missionOutstandingXP', group: OptionGroupId.XP_PROGRESSION,
    label: 'Mission Outstanding XP', description: 'XP awarded for outstanding mission success',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.missionOutstandingXP,
  },
  useAgingEffects: {
    key: 'useAgingEffects', group: OptionGroupId.XP_PROGRESSION,
    label: 'Use Aging Effects', description: 'Whether to apply aging effects (attribute decay, trait application)',
    type: 'boolean', defaultValue: defaults.useAgingEffects,
  },

  // =========================================================================
  // Financial
  // =========================================================================
  startingFunds: {
    key: 'startingFunds', group: OptionGroupId.FINANCIAL,
    label: 'Starting Funds', description: 'Starting funds in C-bills',
    type: 'number', min: 0, step: 100000, defaultValue: defaults.startingFunds,
  },
  maintenanceCostMultiplier: {
    key: 'maintenanceCostMultiplier', group: OptionGroupId.FINANCIAL,
    label: 'Maintenance Cost Multiplier', description: 'Multiplier for maintenance costs (1.0 = normal)',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.maintenanceCostMultiplier,
  },
  repairCostMultiplier: {
    key: 'repairCostMultiplier', group: OptionGroupId.FINANCIAL,
    label: 'Repair Cost Multiplier', description: 'Multiplier for repair costs (1.0 = normal)',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.repairCostMultiplier,
  },
  acquisitionCostMultiplier: {
    key: 'acquisitionCostMultiplier', group: OptionGroupId.FINANCIAL,
    label: 'Acquisition Cost Multiplier', description: 'Multiplier for part acquisition costs (1.0 = normal)',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.acquisitionCostMultiplier,
  },
  payForMaintenance: {
    key: 'payForMaintenance', group: OptionGroupId.FINANCIAL,
    label: 'Pay For Maintenance', description: 'Whether to pay for unit maintenance',
    type: 'boolean', defaultValue: defaults.payForMaintenance,
  },
  payForRepairs: {
    key: 'payForRepairs', group: OptionGroupId.FINANCIAL,
    label: 'Pay For Repairs', description: 'Whether to pay for repairs',
    type: 'boolean', defaultValue: defaults.payForRepairs,
  },
  payForSalaries: {
    key: 'payForSalaries', group: OptionGroupId.FINANCIAL,
    label: 'Pay For Salaries', description: 'Whether to pay salaries',
    type: 'boolean', defaultValue: defaults.payForSalaries,
  },
  payForAmmunition: {
    key: 'payForAmmunition', group: OptionGroupId.FINANCIAL,
    label: 'Pay For Ammunition', description: 'Whether to pay for ammunition',
    type: 'boolean', defaultValue: defaults.payForAmmunition,
  },
  maintenanceCycleDays: {
    key: 'maintenanceCycleDays', group: OptionGroupId.FINANCIAL,
    label: 'Maintenance Cycle Days', description: 'Days between maintenance cycles (0 = disabled)',
    type: 'number', min: 0, max: 365, step: 1, defaultValue: defaults.maintenanceCycleDays,
  },
  useLoanSystem: {
    key: 'useLoanSystem', group: OptionGroupId.FINANCIAL,
    label: 'Use Loan System', description: 'Whether to use loan system',
    type: 'boolean', defaultValue: defaults.useLoanSystem,
  },
  useTaxes: {
    key: 'useTaxes', group: OptionGroupId.FINANCIAL,
    label: 'Use Taxes', description: 'Whether to use tax system',
    type: 'boolean', defaultValue: defaults.useTaxes,
  },
  taxRate: {
    key: 'taxRate', group: OptionGroupId.FINANCIAL,
    label: 'Tax Rate', description: 'Tax rate as percentage (e.g., 10 = 10%)',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.taxRate,
  },
  overheadPercent: {
    key: 'overheadPercent', group: OptionGroupId.FINANCIAL,
    label: 'Overhead Percent', description: 'Overhead percentage of salary',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.overheadPercent,
  },
  useRoleBasedSalaries: {
    key: 'useRoleBasedSalaries', group: OptionGroupId.FINANCIAL,
    label: 'Use Role-Based Salaries', description: 'Whether to use role-based salary system',
    type: 'boolean', defaultValue: defaults.useRoleBasedSalaries,
  },
  payForSecondaryRole: {
    key: 'payForSecondaryRole', group: OptionGroupId.FINANCIAL,
    label: 'Pay For Secondary Role', description: 'Whether to pay for secondary role assignments',
    type: 'boolean', defaultValue: defaults.payForSecondaryRole,
  },
  maxLoanPercent: {
    key: 'maxLoanPercent', group: OptionGroupId.FINANCIAL,
    label: 'Max Loan Percent', description: 'Maximum loan as percentage of total assets',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.maxLoanPercent,
  },
  defaultLoanRate: {
    key: 'defaultLoanRate', group: OptionGroupId.FINANCIAL,
    label: 'Default Loan Rate', description: 'Default annual loan interest rate',
    type: 'number', min: 0, max: 100, step: 0.5, defaultValue: defaults.defaultLoanRate,
  },
  taxFrequency: {
    key: 'taxFrequency', group: OptionGroupId.FINANCIAL,
    label: 'Tax Frequency', description: 'Tax payment frequency',
    type: 'enum', enumValues: ['monthly', 'quarterly', 'annually'], defaultValue: defaults.taxFrequency,
  },
  useFoodAndHousing: {
    key: 'useFoodAndHousing', group: OptionGroupId.FINANCIAL,
    label: 'Use Food And Housing', description: 'Whether to use food and housing costs',
    type: 'boolean', defaultValue: defaults.useFoodAndHousing,
  },
  clanPriceMultiplier: {
    key: 'clanPriceMultiplier', group: OptionGroupId.FINANCIAL,
    label: 'Clan Price Multiplier', description: 'Price multiplier for clan equipment',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.clanPriceMultiplier,
  },
  mixedTechPriceMultiplier: {
    key: 'mixedTechPriceMultiplier', group: OptionGroupId.FINANCIAL,
    label: 'Mixed Tech Price Multiplier', description: 'Price multiplier for mixed tech equipment',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.mixedTechPriceMultiplier,
  },
  usedEquipmentMultiplier: {
    key: 'usedEquipmentMultiplier', group: OptionGroupId.FINANCIAL,
    label: 'Used Equipment Multiplier', description: 'Price multiplier for used equipment',
    type: 'number', min: 0, max: 10, step: 0.01, defaultValue: defaults.usedEquipmentMultiplier,
  },
  damagedEquipmentMultiplier: {
    key: 'damagedEquipmentMultiplier', group: OptionGroupId.FINANCIAL,
    label: 'Damaged Equipment Multiplier', description: 'Price multiplier for damaged equipment',
    type: 'number', min: 0, max: 10, step: 0.01, defaultValue: defaults.damagedEquipmentMultiplier,
  },

  // =========================================================================
  // Combat
  // =========================================================================
  useAutoResolve: {
    key: 'useAutoResolve', group: OptionGroupId.COMBAT,
    label: 'Use Auto-Resolve', description: 'Whether to use auto-resolve for battles',
    type: 'boolean', defaultValue: defaults.useAutoResolve,
  },
  autoResolveCasualtyRate: {
    key: 'autoResolveCasualtyRate', group: OptionGroupId.COMBAT,
    label: 'Auto-Resolve Casualty Rate', description: 'Casualty rate multiplier for auto-resolve (1.0 = normal)',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.autoResolveCasualtyRate,
  },
  allowPilotCapture: {
    key: 'allowPilotCapture', group: OptionGroupId.COMBAT,
    label: 'Allow Pilot Capture', description: 'Whether pilots can be captured',
    type: 'boolean', defaultValue: defaults.allowPilotCapture,
  },
  useRandomInjuries: {
    key: 'useRandomInjuries', group: OptionGroupId.COMBAT,
    label: 'Use Random Injuries', description: 'Whether to use random pilot injuries',
    type: 'boolean', defaultValue: defaults.useRandomInjuries,
  },
  pilotDeathChance: {
    key: 'pilotDeathChance', group: OptionGroupId.COMBAT,
    label: 'Pilot Death Chance', description: 'Chance of pilot death on mech destruction (0.0-1.0)',
    type: 'number', min: 0, max: 1, step: 0.01, defaultValue: defaults.pilotDeathChance,
  },
  autoEject: {
    key: 'autoEject', group: OptionGroupId.COMBAT,
    label: 'Auto Eject', description: 'Whether ejection is automatic on destruction',
    type: 'boolean', defaultValue: defaults.autoEject,
  },
  trackAmmunition: {
    key: 'trackAmmunition', group: OptionGroupId.COMBAT,
    label: 'Track Ammunition', description: 'Whether to track ammunition usage',
    type: 'boolean', defaultValue: defaults.trackAmmunition,
  },
  useQuirks: {
    key: 'useQuirks', group: OptionGroupId.COMBAT,
    label: 'Use Quirks', description: 'Whether to use quirks system',
    type: 'boolean', defaultValue: defaults.useQuirks,
  },
  useAtBScenarios: {
    key: 'useAtBScenarios', group: OptionGroupId.COMBAT,
    label: 'Use AtB Scenarios', description: 'Whether to use AtB dynamic scenario generation',
    type: 'boolean', defaultValue: false,
  },
  difficultyMultiplier: {
    key: 'difficultyMultiplier', group: OptionGroupId.COMBAT,
    label: 'Difficulty Multiplier', description: 'Difficulty multiplier for OpFor BV calculation (0.5 easy to 2.0 hard)',
    type: 'number', min: 0.5, max: 2.0, step: 0.1, defaultValue: 1.0,
  },

  // =========================================================================
  // Force Organization
  // =========================================================================
  maxUnitsPerLance: {
    key: 'maxUnitsPerLance', group: OptionGroupId.FORCE_ORGANIZATION,
    label: 'Max Units Per Lance', description: 'Maximum units per lance',
    type: 'number', min: 1, max: 12, step: 1, defaultValue: defaults.maxUnitsPerLance,
  },
  maxLancesPerCompany: {
    key: 'maxLancesPerCompany', group: OptionGroupId.FORCE_ORGANIZATION,
    label: 'Max Lances Per Company', description: 'Maximum lances per company',
    type: 'number', min: 1, max: 12, step: 1, defaultValue: defaults.maxLancesPerCompany,
  },
  enforceFormationRules: {
    key: 'enforceFormationRules', group: OptionGroupId.FORCE_ORGANIZATION,
    label: 'Enforce Formation Rules', description: 'Whether to enforce formation rules',
    type: 'boolean', defaultValue: defaults.enforceFormationRules,
  },
  allowMixedFormations: {
    key: 'allowMixedFormations', group: OptionGroupId.FORCE_ORGANIZATION,
    label: 'Allow Mixed Formations', description: 'Whether to allow mixed unit types in formations',
    type: 'boolean', defaultValue: defaults.allowMixedFormations,
  },
  requireForceCommanders: {
    key: 'requireForceCommanders', group: OptionGroupId.FORCE_ORGANIZATION,
    label: 'Require Force Commanders', description: 'Whether to require commanders for forces',
    type: 'boolean', defaultValue: defaults.requireForceCommanders,
  },
  useCombatTeams: {
    key: 'useCombatTeams', group: OptionGroupId.FORCE_ORGANIZATION,
    label: 'Use Combat Teams', description: 'Whether to use combat teams (AtB)',
    type: 'boolean', defaultValue: defaults.useCombatTeams,
  },

  // =========================================================================
  // General
  // =========================================================================
  dateFormat: {
    key: 'dateFormat', group: OptionGroupId.GENERAL,
    label: 'Date Format', description: 'Date format for display',
    type: 'string', defaultValue: defaults.dateFormat,
  },
  useFactionRules: {
    key: 'useFactionRules', group: OptionGroupId.GENERAL,
    label: 'Use Faction Rules', description: 'Whether to use faction-specific rules',
    type: 'boolean', defaultValue: defaults.useFactionRules,
  },
  techLevel: {
    key: 'techLevel', group: OptionGroupId.GENERAL,
    label: 'Tech Level', description: 'Tech level limit (0=Intro, 1=Standard, 2=Advanced, 3=Experimental)',
    type: 'number', min: 0, max: 3, step: 1, defaultValue: defaults.techLevel,
  },

  // =========================================================================
  // Acquisition
  // =========================================================================
  useAcquisitionSystem: {
    key: 'useAcquisitionSystem', group: OptionGroupId.GENERAL,
    label: 'Use Acquisition System', description: 'Whether to use the acquisition/procurement system',
    type: 'boolean', defaultValue: defaults.useAcquisitionSystem,
  },
  usePlanetaryModifiers: {
    key: 'usePlanetaryModifiers', group: OptionGroupId.GENERAL,
    label: 'Use Planetary Modifiers', description: 'Whether to apply planetary availability modifiers',
    type: 'boolean', defaultValue: defaults.usePlanetaryModifiers,
  },
  acquisitionTransitUnit: {
    key: 'acquisitionTransitUnit', group: OptionGroupId.GENERAL,
    label: 'Acquisition Transit Unit', description: 'Time unit for acquisition transit',
    type: 'enum', enumValues: ['day', 'week', 'month'], defaultValue: defaults.acquisitionTransitUnit,
  },
  clanPartsPenalty: {
    key: 'clanPartsPenalty', group: OptionGroupId.GENERAL,
    label: 'Clan Parts Penalty', description: 'Whether to apply penalty for Clan parts in IS factions',
    type: 'boolean', defaultValue: defaults.clanPartsPenalty,
  },

  // =========================================================================
  // Events / General
  // =========================================================================
  limitByYear: {
    key: 'limitByYear', group: OptionGroupId.GENERAL,
    label: 'Limit By Year', description: 'Whether to limit equipment by year',
    type: 'boolean', defaultValue: defaults.limitByYear,
  },
  allowClanEquipment: {
    key: 'allowClanEquipment', group: OptionGroupId.GENERAL,
    label: 'Allow Clan Equipment', description: 'Whether to allow Clan equipment for IS factions',
    type: 'boolean', defaultValue: defaults.allowClanEquipment,
  },
  useRandomEvents: {
    key: 'useRandomEvents', group: OptionGroupId.EVENTS,
    label: 'Use Random Events', description: 'Whether to use random events',
    type: 'boolean', defaultValue: defaults.useRandomEvents,
  },
  usePrisonerEvents: {
    key: 'usePrisonerEvents', group: OptionGroupId.EVENTS,
    label: 'Use Prisoner Events', description: 'Whether to use prisoner random events',
    type: 'boolean', defaultValue: defaults.usePrisonerEvents,
  },
  useLifeEvents: {
    key: 'useLifeEvents', group: OptionGroupId.EVENTS,
    label: 'Use Life Events', description: 'Whether to use life random events',
    type: 'boolean', defaultValue: defaults.useLifeEvents,
  },
  useContractEvents: {
    key: 'useContractEvents', group: OptionGroupId.EVENTS,
    label: 'Use Contract Events', description: 'Whether to use contract random events',
    type: 'boolean', defaultValue: defaults.useContractEvents,
  },
  simulateGrayMonday: {
    key: 'simulateGrayMonday', group: OptionGroupId.EVENTS,
    label: 'Simulate Gray Monday', description: 'Whether to simulate Gray Monday historical event',
    type: 'boolean', defaultValue: defaults.simulateGrayMonday,
  },
  enableDayReportNotifications: {
    key: 'enableDayReportNotifications', group: OptionGroupId.GENERAL,
    label: 'Enable Day Report Notifications', description: 'Whether to show day report notifications after advancing',
    type: 'boolean', defaultValue: defaults.enableDayReportNotifications,
  },

  // =========================================================================
  // Turnover
  // =========================================================================
  useTurnover: {
    key: 'useTurnover', group: OptionGroupId.TURNOVER,
    label: 'Use Turnover', description: 'Whether to use turnover system',
    type: 'boolean', defaultValue: defaults.useTurnover,
  },
  turnoverFixedTargetNumber: {
    key: 'turnoverFixedTargetNumber', group: OptionGroupId.TURNOVER,
    label: 'Turnover Fixed Target Number', description: 'Fixed target number for turnover checks',
    type: 'number', min: 1, max: 12, step: 1, defaultValue: defaults.turnoverFixedTargetNumber,
  },
  turnoverCheckFrequency: {
    key: 'turnoverCheckFrequency', group: OptionGroupId.TURNOVER,
    label: 'Turnover Check Frequency', description: 'How often turnover checks occur',
    type: 'enum', enumValues: ['weekly', 'monthly', 'quarterly', 'annually', 'never'], defaultValue: defaults.turnoverCheckFrequency,
  },
  turnoverCommanderImmune: {
    key: 'turnoverCommanderImmune', group: OptionGroupId.TURNOVER,
    label: 'Turnover Commander Immune', description: 'Whether the commander is immune to turnover',
    type: 'boolean', defaultValue: defaults.turnoverCommanderImmune,
  },
  turnoverPayoutMultiplier: {
    key: 'turnoverPayoutMultiplier', group: OptionGroupId.TURNOVER,
    label: 'Turnover Payout Multiplier', description: 'Multiplier for turnover payout',
    type: 'number', min: 0, max: 100, step: 1, defaultValue: defaults.turnoverPayoutMultiplier,
  },
  turnoverUseSkillModifiers: {
    key: 'turnoverUseSkillModifiers', group: OptionGroupId.TURNOVER,
    label: 'Turnover Use Skill Modifiers', description: 'Whether to use skill modifiers for turnover',
    type: 'boolean', defaultValue: defaults.turnoverUseSkillModifiers,
  },
  turnoverUseAgeModifiers: {
    key: 'turnoverUseAgeModifiers', group: OptionGroupId.TURNOVER,
    label: 'Turnover Use Age Modifiers', description: 'Whether to use age modifiers for turnover',
    type: 'boolean', defaultValue: defaults.turnoverUseAgeModifiers,
  },
  turnoverUseMissionStatusModifiers: {
    key: 'turnoverUseMissionStatusModifiers', group: OptionGroupId.TURNOVER,
    label: 'Turnover Use Mission Status Modifiers', description: 'Whether to use mission status modifiers for turnover',
    type: 'boolean', defaultValue: defaults.turnoverUseMissionStatusModifiers,
  },

  // =========================================================================
  // Faction Standing
  // =========================================================================
  trackFactionStanding: {
    key: 'trackFactionStanding', group: OptionGroupId.FACTION_STANDING,
    label: 'Track Faction Standing', description: 'Whether to track faction standing',
    type: 'boolean', defaultValue: defaults.trackFactionStanding,
  },
  regardChangeMultiplier: {
    key: 'regardChangeMultiplier', group: OptionGroupId.FACTION_STANDING,
    label: 'Regard Change Multiplier', description: 'Multiplier for regard changes (1.0 = normal)',
    type: 'number', min: 0, max: 10, step: 0.1, defaultValue: defaults.regardChangeMultiplier,
  },

  // =========================================================================
  // Auto-Award (Advanced)
  // =========================================================================
  autoAwardConfig: {
    key: 'autoAwardConfig', group: OptionGroupId.ADVANCED,
    label: 'Auto-Award Configuration', description: 'Auto-award system configuration (complex object)',
    type: 'string', defaultValue: undefined,
  },

  // =========================================================================
  // Rank System
  // =========================================================================
  rankSystemCode: {
    key: 'rankSystemCode', group: OptionGroupId.PERSONNEL,
    label: 'Rank System Code', description: 'Code of the active rank system',
    type: 'string', defaultValue: defaults.rankSystemCode,
  },

  // =========================================================================
  // Markets
  // =========================================================================
  unitMarketMethod: {
    key: 'unitMarketMethod', group: OptionGroupId.MARKETS,
    label: 'Unit Market Method', description: 'Unit market generation method',
    type: 'enum', enumValues: ['none', 'atb_monthly'], defaultValue: defaults.unitMarketMethod,
  },
  personnelMarketStyle: {
    key: 'personnelMarketStyle', group: OptionGroupId.MARKETS,
    label: 'Personnel Market Style', description: 'Personnel market generation style',
    type: 'enum', enumValues: Object.values(PersonnelMarketStyle), defaultValue: defaults.personnelMarketStyle,
  },
  contractMarketMethod: {
    key: 'contractMarketMethod', group: OptionGroupId.MARKETS,
    label: 'Contract Market Method', description: 'Contract market generation method',
    type: 'enum', enumValues: ['none', 'atb_monthly', 'cam_ops'], defaultValue: defaults.contractMarketMethod,
  },
};
