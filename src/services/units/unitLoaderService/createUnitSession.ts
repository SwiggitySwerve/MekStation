import type { UnitState } from '@/stores/unitState';
import type { IUnitDefinitionReference } from '@/types/unit/UnitDefinition';

import type { NormalizedUnitConfiguration } from './normalizeUnitConfiguration';

export interface IUnitSessionIdentity {
  readonly id: string;
  readonly createdAt: number;
}

export function createUnitSession(
  configuration: NormalizedUnitConfiguration,
  identity: IUnitSessionIdentity,
  sourceDefinition?: IUnitDefinitionReference,
): UnitState {
  return {
    ...configuration,
    armorAllocation: { ...configuration.armorAllocation },
    componentTechBases: { ...configuration.componentTechBases },
    selectionMemory: {
      engine: { ...configuration.selectionMemory.engine },
      gyro: { ...configuration.selectionMemory.gyro },
      structure: { ...configuration.selectionMemory.structure },
      cockpit: { ...configuration.selectionMemory.cockpit },
      heatSink: { ...configuration.selectionMemory.heatSink },
      armor: { ...configuration.selectionMemory.armor },
    },
    equipment: configuration.equipment.map((item) => ({
      ...item,
      ...(item.slots ? { slots: [...item.slots] } : {}),
    })),
    ...(configuration.crewSeats
      ? { crewSeats: configuration.crewSeats.map((seat) => ({ ...seat })) }
      : {}),
    ...(configuration.fluff
      ? {
          fluff: {
            ...configuration.fluff,
            ...(configuration.fluff.systemManufacturer
              ? {
                  systemManufacturer: {
                    ...configuration.fluff.systemManufacturer,
                  },
                }
              : {}),
          },
        }
      : {}),
    id: identity.id,
    createdAt: identity.createdAt,
    lastModifiedAt: identity.createdAt,
    isModified: false,
    ...(sourceDefinition ? { sourceDefinition: { ...sourceDefinition } } : {}),
  };
}
