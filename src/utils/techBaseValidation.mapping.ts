import { TechBaseComponent } from '@/types/construction/TechBaseConfiguration';

import type { ComponentSelections } from './techBaseValidation';

export const COMPONENT_AFFECTED_SELECTIONS: Record<
  TechBaseComponent,
  Array<keyof ComponentSelections>
> = {
  engine: ['engineType'],
  gyro: ['gyroType'],
  chassis: ['internalStructureType', 'cockpitType'],
  heatsink: ['heatSinkType'],
  targeting: [],
  myomer: [],
  movement: [],
  armor: ['armorType'],
};
