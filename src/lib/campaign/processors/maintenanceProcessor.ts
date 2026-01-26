import type { ICampaign, ICampaignOptions, MaintenanceFrequency } from '@/types/campaign/Campaign';
import { getAllUnits } from '@/types/campaign/Campaign';
import type { IPerson } from '@/types/campaign/Person';
import { isActive } from '@/types/campaign/Person';
import {
  PartQuality,
  DEFAULT_UNIT_QUALITY,
  degradeQuality,
} from '@/types/campaign/quality';
import type { IUnitQuality } from '@/types/campaign/quality/IUnitQuality';
import type { IMaintenanceRecord } from '@/types/campaign/quality/IUnitQuality';
import { getTechSkillValue } from '@/types/campaign/skills/techSkill';
import {
  performMaintenanceCheck,
  type MaintenanceCheckInput,
  type MaintenanceCheckResult,
  type RandomFn,
} from '../maintenance/maintenanceCheck';
import {
  type IDayProcessor,
  type IDayProcessorResult,
  type IDayEvent,
  DayPhase,
  getDayPipeline,
  isMonday,
  isFirstOfMonth,
  isFirstOfYear,
} from '../dayPipeline';

const QUARTER_MONTHS = new Set([0, 3, 6, 9]);

function isFirstOfQuarter(date: Date): boolean {
  return date.getUTCDate() === 1 && QUARTER_MONTHS.has(date.getUTCMonth());
}

export function shouldRunMaintenance(
  options: Partial<Pick<ICampaignOptions, 'maintenanceCheckFrequency'>>,
  date: Date,
): boolean {
  const frequency: MaintenanceFrequency = options.maintenanceCheckFrequency ?? 'weekly';

  switch (frequency) {
    case 'weekly':
      return isMonday(date);
    case 'monthly':
      return isFirstOfMonth(date);
    case 'quarterly':
      return isFirstOfQuarter(date);
    case 'annually':
      return isFirstOfYear(date);
    case 'never':
      return false;
  }
}

function findTechForUnit(
  unitId: string,
  personnel: Map<string, IPerson>,
): IPerson | undefined {
  for (const person of Array.from(personnel.values())) {
    if (!isActive(person)) continue;
    if (person.techUnitIds?.includes(unitId)) return person;
  }
  return undefined;
}

function getUnitQuality(
  unitId: string,
  unitQualities?: Map<string, IUnitQuality>,
): PartQuality {
  return unitQualities?.get(unitId)?.quality ?? DEFAULT_UNIT_QUALITY;
}

export interface MaintenanceProcessorInput {
  readonly campaign: ICampaign;
  readonly date: Date;
  readonly random: RandomFn;
}

export interface MaintenanceUnitResult {
  readonly unitId: string;
  readonly techId?: string;
  readonly techName?: string;
  readonly checkResult?: MaintenanceCheckResult;
  readonly unmaintained: boolean;
  readonly qualityBefore: PartQuality;
  readonly qualityAfter: PartQuality;
}

export function runMaintenanceForAllUnits(
  input: MaintenanceProcessorInput,
): MaintenanceUnitResult[] {
  const { campaign, random } = input;
  const unitIds = getAllUnits(campaign);
  const results: MaintenanceUnitResult[] = [];

  for (const unitId of unitIds) {
    const quality = getUnitQuality(unitId, campaign.unitQualities);
    const tech = findTechForUnit(unitId, campaign.personnel);

    if (!tech) {
      results.push({
        unitId,
        unmaintained: true,
        qualityBefore: quality,
        qualityAfter: degradeQuality(quality),
      });
      continue;
    }

    const techSkillValue = getTechSkillValue(tech);

    const checkInput: MaintenanceCheckInput = {
      unitId,
      quality,
      techSkillValue,
      modePenalty: 0,
      quirksModifier: 0,
      overtimeModifier: 0,
      shorthandedModifier: 0,
    };

    const checkResult = performMaintenanceCheck(checkInput, random);

    results.push({
      unitId,
      techId: tech.id,
      techName: tech.name,
      checkResult,
      unmaintained: false,
      qualityBefore: checkResult.qualityBefore,
      qualityAfter: checkResult.qualityAfter,
    });
  }

  return results;
}

export function applyMaintenanceResults(
  campaign: ICampaign,
  results: MaintenanceUnitResult[],
  date: Date,
): ICampaign {
  if (results.length === 0) return campaign;

  const updatedQualities = new Map(campaign.unitQualities ?? new Map<string, IUnitQuality>());

  for (const result of results) {
    const existing = updatedQualities.get(result.unitId);
    const history: IMaintenanceRecord[] = existing?.maintenanceHistory
      ? [...existing.maintenanceHistory]
      : [];

    if (result.checkResult) {
      history.push({
        date,
        techId: result.techId,
        roll: result.checkResult.roll,
        targetNumber: result.checkResult.targetNumber,
        margin: result.checkResult.margin,
        outcome: result.checkResult.outcome,
        qualityBefore: result.qualityBefore,
        qualityAfter: result.qualityAfter,
      });
    } else {
      history.push({
        date,
        roll: 0,
        targetNumber: 0,
        margin: 0,
        outcome: 'failure',
        qualityBefore: result.qualityBefore,
        qualityAfter: result.qualityAfter,
      });
    }

    updatedQualities.set(result.unitId, {
      unitId: result.unitId,
      quality: result.qualityAfter,
      lastMaintenanceDate: date,
      maintenanceHistory: history,
    });
  }

  return {
    ...campaign,
    unitQualities: updatedQualities,
  };
}

function resultToEvent(result: MaintenanceUnitResult): IDayEvent {
  if (result.unmaintained) {
    const degraded = result.qualityBefore !== result.qualityAfter;
    return {
      type: 'maintenance_unmaintained',
      description: degraded
        ? `Unit ${result.unitId} has no assigned tech — quality degraded from ${result.qualityBefore} to ${result.qualityAfter}`
        : `Unit ${result.unitId} has no assigned tech — quality already at worst (${result.qualityBefore})`,
      severity: 'warning',
      data: {
        unitId: result.unitId,
        unmaintained: true,
        qualityBefore: result.qualityBefore,
        qualityAfter: result.qualityAfter,
      },
    };
  }

  const cr = result.checkResult!;
  const qualityChanged = cr.qualityBefore !== cr.qualityAfter;

  if (cr.outcome === 'critical_failure') {
    return {
      type: 'maintenance_critical_failure',
      description: `Maintenance critical failure on unit ${result.unitId} by ${result.techName} (rolled ${cr.roll} vs TN ${cr.targetNumber}) — quality degraded to ${cr.qualityAfter}`,
      severity: 'critical',
      data: buildEventData(result),
    };
  }

  if (cr.outcome === 'critical_success') {
    return {
      type: 'maintenance_quality_improved',
      description: `Excellent maintenance on unit ${result.unitId} by ${result.techName} (rolled ${cr.roll} vs TN ${cr.targetNumber}) — quality improved to ${cr.qualityAfter}`,
      severity: 'info',
      data: buildEventData(result),
    };
  }

  if (cr.outcome === 'failure' && qualityChanged) {
    return {
      type: 'maintenance_failure',
      description: `Maintenance failure on unit ${result.unitId} by ${result.techName} (rolled ${cr.roll} vs TN ${cr.targetNumber}) — quality degraded to ${cr.qualityAfter}`,
      severity: 'warning',
      data: buildEventData(result),
    };
  }

  return {
    type: 'maintenance_success',
    description: `Maintenance ${cr.outcome} on unit ${result.unitId} by ${result.techName} (rolled ${cr.roll} vs TN ${cr.targetNumber})`,
    severity: 'info',
    data: buildEventData(result),
  };
}

function buildEventData(result: MaintenanceUnitResult): Record<string, unknown> {
  const cr = result.checkResult!;
  return {
    unitId: result.unitId,
    techId: result.techId,
    techName: result.techName,
    roll: cr.roll,
    targetNumber: cr.targetNumber,
    margin: cr.margin,
    outcome: cr.outcome,
    qualityBefore: cr.qualityBefore,
    qualityAfter: cr.qualityAfter,
    modifiers: cr.modifierBreakdown,
  };
}

export function createMaintenanceProcessor(random: RandomFn = Math.random): IDayProcessor {
  return {
    id: 'maintenance',
    phase: DayPhase.UNITS,
    displayName: 'Maintenance Check',

    process(campaign: ICampaign, date: Date): IDayProcessorResult {
      if (!shouldRunMaintenance(campaign.options, date)) {
        return { events: [], campaign };
      }

      const results = runMaintenanceForAllUnits({ campaign, date, random });
      const updatedCampaign = applyMaintenanceResults(campaign, results, date);
      const events = results.map(resultToEvent);

      return { events, campaign: updatedCampaign };
    },
  };
}

export const maintenanceProcessor: IDayProcessor = createMaintenanceProcessor();

export function registerMaintenanceProcessor(): void {
  getDayPipeline().register(maintenanceProcessor);
}
