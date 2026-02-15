import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  TechBaseMode,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  IComponentSelections,
  UnitTab,
  UnitTemplate,
} from './useMultiUnitStore.types';

export function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createDefaultComponentSelections(
  tonnage: number,
  walkMP: number = 4,
  _techBase: TechBase = TechBase.INNER_SPHERE,
): IComponentSelections {
  const engineRating = tonnage * walkMP;

  return {
    engineType: EngineType.STANDARD,
    engineRating,
    gyroType: GyroType.STANDARD,
    internalStructureType: InternalStructureType.STANDARD,
    cockpitType: CockpitType.STANDARD,
    heatSinkType: HeatSinkType.SINGLE,
    heatSinkCount: 10,
    armorType: ArmorTypeEnum.STANDARD,
  };
}

export function createNewTab(
  template: UnitTemplate,
  customName?: string,
): UnitTab {
  const id = generateTabId();
  const now = Date.now();
  const name = customName || 'Mek';

  const initialMode: TechBaseMode =
    template.techBase === TechBase.CLAN
      ? TechBaseMode.CLAN
      : TechBaseMode.INNER_SPHERE;

  return {
    id,
    name,
    unitType: UnitType.BATTLEMECH,
    tonnage: template.tonnage,
    techBase: template.techBase,
    configuration: MechConfiguration.BIPED,
    isModified: true,
    createdAt: now,
    lastModifiedAt: now,
    techBaseMode: initialMode,
    componentTechBases: createDefaultComponentTechBases(template.techBase),
    componentSelections: createDefaultComponentSelections(
      template.tonnage,
      template.walkMP,
      template.techBase,
    ),
  };
}

export function duplicateTabData(sourceTab: UnitTab): UnitTab {
  const id = generateTabId();
  const now = Date.now();

  return {
    ...sourceTab,
    id,
    name: `${sourceTab.name} (Copy)`,
    isModified: true,
    createdAt: now,
    lastModifiedAt: now,
    componentTechBases: { ...sourceTab.componentTechBases },
    componentSelections: { ...sourceTab.componentSelections },
  };
}
