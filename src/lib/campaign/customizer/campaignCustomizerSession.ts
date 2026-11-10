import type { UnitState } from '@/stores/unitState';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { RulesLevel } from '@/types/enums/RulesLevel';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import {
  armorResultToAllocation,
  createDefaultUnitState,
} from '@/stores/unitState';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  calculateArmorWeight,
  calculateOptimalArmorAllocation,
} from '@/utils/construction/armorCalculations';
import { projectMechBuildConfig } from '@/utils/validation/mechValidationProjection';

export interface BuildCampaignEditorUnitStateParams {
  readonly editorUnitId: string;
  readonly unit: IRosterUnitProjection;
  readonly currentConfiguration: MechBuildConfig;
  readonly rulesLevel: RulesLevel;
}

function walkMpFrom(config: MechBuildConfig): number {
  if (config.tonnage <= 0) return 4;
  return Math.max(1, Math.floor(config.engineRating / config.tonnage));
}

function buildArmorAllocation(
  config: MechBuildConfig,
): UnitState['armorAllocation'] {
  return armorResultToAllocation(
    calculateOptimalArmorAllocation(
      config.totalArmorPoints,
      config.tonnage,
      config.configuration,
    ),
  );
}

export function buildCampaignEditorUnitState({
  currentConfiguration,
  editorUnitId,
  rulesLevel,
  unit,
}: BuildCampaignEditorUnitStateParams): UnitState {
  const defaultState = createDefaultUnitState({
    id: editorUnitId,
    name: unit.unitName,
    tonnage: currentConfiguration.tonnage,
    techBase: TechBase.INNER_SPHERE,
    walkMP: walkMpFrom(currentConfiguration),
  });

  return {
    ...defaultState,
    name: unit.unitName,
    chassis: unit.unitName,
    model: unit.chassisVariant,
    rulesLevel,
    unitType: UnitType.BATTLEMECH,
    tonnage: currentConfiguration.tonnage,
    configuration:
      currentConfiguration.configuration ?? defaultState.configuration,
    frankenStructure: currentConfiguration.frankenStructure,
    engineRating: currentConfiguration.engineRating,
    engineType: currentConfiguration.engineType,
    gyroType: currentConfiguration.gyroType,
    internalStructureType: currentConfiguration.internalStructureType,
    armorType: currentConfiguration.armorType,
    armorTonnage: calculateArmorWeight(
      currentConfiguration.totalArmorPoints,
      currentConfiguration.armorType,
    ),
    armorAllocation: buildArmorAllocation(currentConfiguration),
    cockpitType: currentConfiguration.cockpitType,
    heatSinkType: currentConfiguration.heatSinkType,
    heatSinkCount: currentConfiguration.totalHeatSinks,
    jumpMP: currentConfiguration.jumpMP,
    isModified: false,
    lastModifiedAt: Date.now(),
  };
}

export function extractMechBuildConfigFromUnitState(
  state: Parameters<typeof projectMechBuildConfig>[0],
): MechBuildConfig {
  return projectMechBuildConfig(state);
}

export function campaignEditorSessionKey(
  campaignId: string,
  unitId: string,
  editorUnitId: string,
): string {
  return `${campaignId}:${unitId}:${editorUnitId}`;
}
