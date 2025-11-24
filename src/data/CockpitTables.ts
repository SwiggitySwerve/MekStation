/**
 * CockpitTables.ts
 * Canonical data for cockpit variants, aligned with TechManual rules.
 */

import { CockpitType } from '../types/SystemComponents';
import { RulesLevel, TechBase } from '../types/TechBase';

export interface ICockpitProfile {
  readonly weight: number;
  readonly slotDistribution: {
    readonly head: number;
    readonly centerTorso: number;
  };
  readonly allowedTechBases: readonly TechBase[];
  readonly minRulesLevel: RulesLevel;
  readonly notes?: string;
}

export const COCKPIT_PROFILES: Record<CockpitType, ICockpitProfile> = {
  [CockpitType.STANDARD]: {
    weight: 3,
    slotDistribution: { head: 1, centerTorso: 0 },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.CLAN, TechBase.MIXED],
    minRulesLevel: RulesLevel.STANDARD,
    notes:
      'Consumes one head slot; remaining head slots are reserved for sensors and life support per BattleTech core rules.',
  },
  [CockpitType.SMALL]: {
    weight: 2,
    slotDistribution: { head: 1, centerTorso: 0 },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.CLAN, TechBase.MIXED],
    minRulesLevel: RulesLevel.ADVANCED,
    notes: '+1 piloting modifier; frees one additional head slot for equipment.',
  },
  [CockpitType.COMMAND_CONSOLE]: {
    weight: 3,
    slotDistribution: { head: 2, centerTorso: 0 },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.CLAN, TechBase.MIXED],
    minRulesLevel: RulesLevel.ADVANCED,
    notes: 'Provides command console seat; no ejection system.',
  },
  [CockpitType.TORSO_MOUNTED]: {
    weight: 4,
    slotDistribution: { head: 0, centerTorso: 1 },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.CLAN, TechBase.MIXED],
    minRulesLevel: RulesLevel.EXPERIMENTAL,
    notes: 'Relocates cockpit to center torso; incompatible with XL gyro per TechManual guidance.',
  },
  [CockpitType.PRIMITIVE]: {
    weight: 5,
    slotDistribution: { head: 5, centerTorso: 0 },
    allowedTechBases: [TechBase.INNER_SPHERE, TechBase.CLAN, TechBase.MIXED],
    minRulesLevel: RulesLevel.STANDARD,
    notes: 'Represents early-era cockpits with reduced protection and no ejection capability.',
  },
};


