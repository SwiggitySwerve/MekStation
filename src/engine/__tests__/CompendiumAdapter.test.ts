import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import {
  adaptUnit,
  adaptUnitFromData,
  getWeaponData,
} from '../adapters/CompendiumAdapter';

jest.mock('@/services/units/CanonicalUnitService', () => {
  const unitStore: Record<string, IFullUnit> = {};

  return {
    getCanonicalUnitService: () => ({
      getById: jest.fn(async (id: string) => unitStore[id] ?? null),
      getIndex: jest.fn(async () => []),
    }),
    __setUnit: (id: string, data: IFullUnit) => {
      unitStore[id] = data;
    },
    __clearUnits: () => {
      for (const key of Object.keys(unitStore)) {
        delete unitStore[key];
      }
    },
  };
});

const mockModule = jest.requireMock(
  '@/services/units/CanonicalUnitService',
) as {
  __setUnit: (id: string, data: IFullUnit) => void;
  __clearUnits: () => void;
};

function createAtlasData(): IFullUnit {
  return {
    id: 'atlas-as7-d',
    chassis: 'Atlas',
    variant: 'AS7-D',
    tonnage: 100,
    techBase: 'INNER_SPHERE',
    era: 'SUCCESSION_WARS',
    unitType: 'BATTLEMECH',
    engine: { type: 'FUSION', rating: 300 },
    armor: {
      type: 'STANDARD',
      allocation: {
        LEFT_ARM: 34,
        RIGHT_ARM: 34,
        LEFT_TORSO: { front: 32, rear: 10 },
        RIGHT_TORSO: { front: 32, rear: 10 },
        CENTER_TORSO: { front: 47, rear: 14 },
        HEAD: 9,
        LEFT_LEG: 41,
        RIGHT_LEG: 41,
      },
    },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'SINGLE', count: 20 },
    movement: { walk: 3, jump: 0 },
    equipment: [
      { id: 'medium-laser', location: 'CENTER_TORSO' },
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'medium-laser', location: 'RIGHT_ARM' },
      { id: 'ac-20', location: 'RIGHT_TORSO' },
      { id: 'lrm-20', location: 'LEFT_TORSO' },
      { id: 'srm-6', location: 'LEFT_TORSO' },
    ],
  } as unknown as IFullUnit;
}

function createLocustData(): IFullUnit {
  return {
    id: 'locust-lct-1v',
    chassis: 'Locust',
    variant: 'LCT-1V',
    tonnage: 20,
    techBase: 'INNER_SPHERE',
    era: 'SUCCESSION_WARS',
    unitType: 'BATTLEMECH',
    engine: { type: 'FUSION', rating: 160 },
    armor: {
      type: 'STANDARD',
      allocation: {
        LEFT_ARM: 4,
        RIGHT_ARM: 4,
        LEFT_TORSO: { front: 8, rear: 2 },
        RIGHT_TORSO: { front: 8, rear: 2 },
        CENTER_TORSO: { front: 10, rear: 4 },
        HEAD: 8,
        LEFT_LEG: 8,
        RIGHT_LEG: 8,
      },
    },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 8, jump: 0 },
    equipment: [
      { id: 'medium-laser', location: 'CENTER_TORSO' },
      { id: 'machine-gun', location: 'LEFT_ARM' },
      { id: 'machine-gun', location: 'RIGHT_ARM' },
    ],
  } as unknown as IFullUnit;
}

function createHunchbackData(): IFullUnit {
  return {
    id: 'hunchback-hbk-4g',
    chassis: 'Hunchback',
    variant: 'HBK-4G',
    tonnage: 50,
    techBase: 'INNER_SPHERE',
    era: 'SUCCESSION_WARS',
    unitType: 'BATTLEMECH',
    engine: { type: 'FUSION', rating: 200 },
    armor: {
      type: 'STANDARD',
      allocation: {
        LEFT_ARM: 16,
        RIGHT_ARM: 16,
        LEFT_TORSO: { front: 20, rear: 6 },
        RIGHT_TORSO: { front: 20, rear: 6 },
        CENTER_TORSO: { front: 26, rear: 8 },
        HEAD: 9,
        LEFT_LEG: 20,
        RIGHT_LEG: 20,
      },
    },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'SINGLE', count: 13 },
    movement: { walk: 4, jump: 0 },
    equipment: [
      { id: 'ac-20', location: 'RIGHT_TORSO' },
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'medium-laser', location: 'RIGHT_ARM' },
      { id: 'small-laser', location: 'HEAD' },
    ],
  } as unknown as IFullUnit;
}

beforeEach(() => {
  mockModule.__clearUnits();
});

describe('CompendiumAdapter', () => {
  describe('getWeaponData', () => {
    it('should return data for known weapons', () => {
      expect(getWeaponData('medium-laser')).toBeDefined();
      expect(getWeaponData('ac-20')).toBeDefined();
      expect(getWeaponData('lrm-20')).toBeDefined();
    });

    it('should return undefined for unknown weapons', () => {
      expect(getWeaponData('plasma-cannon')).toBeUndefined();
    });

    it('should have correct stats for medium laser', () => {
      const ml = getWeaponData('medium-laser')!;
      expect(ml.damage).toBe(5);
      expect(ml.heat).toBe(3);
      expect(ml.shortRange).toBe(3);
      expect(ml.mediumRange).toBe(6);
      expect(ml.longRange).toBe(9);
      expect(ml.ammoPerTon).toBe(-1);
    });
  });

  describe('adaptUnitFromData — Atlas AS7-D', () => {
    it('should produce correct id and side', () => {
      const result = adaptUnitFromData(createAtlasData());
      expect(result.id).toBe('atlas-as7-d');
      expect(result.side).toBe('player');
    });

    it('should have correct movement (walk 3, run 5, jump 0)', () => {
      const result = adaptUnitFromData(createAtlasData());
      expect(result.walkMP).toBe(3);
      expect(result.runMP).toBe(5);
      expect(result.jumpMP).toBe(0);
    });

    it('should have 7 weapons (4 ML, 1 AC/20, 1 LRM-20, 1 SRM-6)', () => {
      const result = adaptUnitFromData(createAtlasData());
      expect(result.weapons).toHaveLength(7);
    });

    it('should have correct front and rear armor for center torso', () => {
      const result = adaptUnitFromData(createAtlasData());
      expect(result.armor.center_torso).toBe(47);
      expect(result.armor.center_torso_rear).toBe(14);
    });

    it('should have correct arm armor (no front/rear split)', () => {
      const result = adaptUnitFromData(createAtlasData());
      expect(result.armor.left_arm).toBe(34);
      expect(result.armor.right_arm).toBe(34);
    });

    it('should have correct structure for 100 tons', () => {
      const result = adaptUnitFromData(createAtlasData());
      expect(result.structure.head).toBe(3);
      expect(result.structure.center_torso).toBe(31);
      expect(result.structure.left_torso).toBe(21);
      expect(result.structure.right_torso).toBe(21);
      expect(result.structure.left_arm).toBe(17);
      expect(result.structure.right_arm).toBe(17);
      expect(result.structure.left_leg).toBe(21);
      expect(result.structure.right_leg).toBe(21);
    });

    it('should not be destroyed initially', () => {
      const result = adaptUnitFromData(createAtlasData());
      expect(result.destroyed).toBe(false);
      expect(result.heat).toBe(0);
      expect(result.pilotWounds).toBe(0);
    });
  });

  describe('adaptUnitFromData — Locust LCT-1V', () => {
    it('should have correct movement (walk 8, run 12, jump 0)', () => {
      const result = adaptUnitFromData(createLocustData());
      expect(result.walkMP).toBe(8);
      expect(result.runMP).toBe(12);
      expect(result.jumpMP).toBe(0);
    });

    it('should have correct structure for 20 tons', () => {
      const result = adaptUnitFromData(createLocustData());
      expect(result.structure.head).toBe(3);
      expect(result.structure.center_torso).toBe(6);
      expect(result.structure.left_torso).toBe(5);
      expect(result.structure.left_arm).toBe(3);
      expect(result.structure.left_leg).toBe(4);
    });

    it('should have 3 weapons (1 ML, 2 MG)', () => {
      const result = adaptUnitFromData(createLocustData());
      expect(result.weapons).toHaveLength(3);
    });
  });

  describe('adaptUnitFromData — Hunchback HBK-4G', () => {
    it('should have correct movement (walk 4, run 6, jump 0)', () => {
      const result = adaptUnitFromData(createHunchbackData());
      expect(result.walkMP).toBe(4);
      expect(result.runMP).toBe(6);
      expect(result.jumpMP).toBe(0);
    });

    it('should have correct structure for 50 tons', () => {
      const result = adaptUnitFromData(createHunchbackData());
      expect(result.structure.center_torso).toBe(16);
      expect(result.structure.left_torso).toBe(12);
      expect(result.structure.left_arm).toBe(8);
      expect(result.structure.left_leg).toBe(12);
    });

    it('should have 4 weapons (1 AC/20, 2 ML, 1 SL)', () => {
      const result = adaptUnitFromData(createHunchbackData());
      expect(result.weapons).toHaveLength(4);
    });
  });

  describe('pilot defaults and overrides', () => {
    it('should default to facing North for player side', () => {
      const result = adaptUnitFromData(createAtlasData(), {
        side: 'player' as never,
      });
      expect(result.facing).toBe(0); // Facing.North
    });

    it('should default to facing South for opponent side', () => {
      const result = adaptUnitFromData(createAtlasData(), {
        side: 'opponent' as never,
      });
      expect(result.facing).toBe(3); // Facing.South
    });

    it('should use default position {q:0, r:0}', () => {
      const result = adaptUnitFromData(createAtlasData());
      expect(result.position).toEqual({ q: 0, r: 0 });
    });

    it('should accept custom position', () => {
      const result = adaptUnitFromData(createAtlasData(), {
        position: { q: 3, r: -2 },
      });
      expect(result.position).toEqual({ q: 3, r: -2 });
    });
  });

  describe('initialDamage', () => {
    it('should subtract damage from armor', () => {
      const result = adaptUnitFromData(createAtlasData(), {
        initialDamage: { center_torso: 10 },
      });
      expect(result.armor.center_torso).toBe(37); // 47 - 10
    });

    it('should not reduce armor below zero', () => {
      const result = adaptUnitFromData(createAtlasData(), {
        initialDamage: { head: 999 },
      });
      expect(result.armor.head).toBe(0);
    });

    it('should not affect locations not specified', () => {
      const result = adaptUnitFromData(createAtlasData(), {
        initialDamage: { left_arm: 5 },
      });
      expect(result.armor.right_arm).toBe(34);
    });
  });

  describe('adaptUnit (async)', () => {
    it('should return null for unknown unit ID', async () => {
      const result = await adaptUnit('nonexistent-mech');
      expect(result).toBeNull();
    });

    it('should return adapted unit for known ID', async () => {
      mockModule.__setUnit('atlas-as7-d', createAtlasData());
      const result = await adaptUnit('atlas-as7-d');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('atlas-as7-d');
      expect(result!.walkMP).toBe(3);
    });
  });
});
