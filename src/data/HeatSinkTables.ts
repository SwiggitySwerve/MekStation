/**
 * HeatSinkTables.ts
 * BattleTech heat sink specifications derived from TechManual rules.
 */

import { HeatSinkType } from '../types/SystemComponents';
import { RulesLevel, TechBase } from '../types/TechBase';

export interface IHeatSinkProfile {
  readonly weightPerSink: number;
  readonly dissipationPerSink: number;
  readonly slotsPerSink: Record<TechBase, number>;
  readonly allowedTechBases: readonly TechBase[];
  readonly minRulesLevel: RulesLevel;
  readonly notes?: string;
}

export const HEAT_SINK_PROFILES: Record<HeatSinkType, IHeatSinkProfile> = {
  [HeatSinkType.SINGLE]: {
    weightPerSink: 1,
    dissipationPerSink: 1,
    slotsPerSink: {
      [TechBase.INNER_SPHERE]: 1,
      [TechBase.CLAN]: 1,
      [TechBase.MIXED]: 1,
    },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.CLAN, TechBase.MIXED],
    minRulesLevel: RulesLevel.INTRODUCTORY,
  },
  [HeatSinkType.DOUBLE]: {
    weightPerSink: 1,
    dissipationPerSink: 2,
    slotsPerSink: {
      [TechBase.INNER_SPHERE]: 3,
      [TechBase.CLAN]: 2,
      [TechBase.MIXED]: 3,
    },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.CLAN, TechBase.MIXED],
    minRulesLevel: RulesLevel.STANDARD,
    notes: 'Clan chassis require only two critical slots; Inner Sphere builds require three.',
  },
  [HeatSinkType.COMPACT]: {
    weightPerSink: 1,
    dissipationPerSink: 1,
    slotsPerSink: {
      [TechBase.INNER_SPHERE]: 1,
      [TechBase.CLAN]: 1,
      [TechBase.MIXED]: 1,
    },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.MIXED],
    minRulesLevel: RulesLevel.ADVANCED,
    notes: 'Compact heat sinks trade tonnage efficiency for space savings in tight builds.',
  },
  [HeatSinkType.LASER]: {
    weightPerSink: 1.5,
    dissipationPerSink: 1,
    slotsPerSink: {
      [TechBase.INNER_SPHERE]: 1,
      [TechBase.CLAN]: 1,
      [TechBase.MIXED]: 1,
    },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.MIXED],
    minRulesLevel: RulesLevel.EXPERIMENTAL,
    notes: 'Laser heat sinks require dedicated optics, increasing weight while preserving slot efficiency.',
  },
};


