/**
 * TerrainTypes Tests
 * Comprehensive test suite for terrain types and properties.
 */

import {
  TerrainType,
  CoverLevel,
  ITerrainFeature,
  ITerrainProperties,
  IHexTerrain,
  TERRAIN_PROPERTIES,
} from '../../../../types/gameplay/TerrainTypes';

describe('TerrainTypes', () => {
  describe('TerrainType enum', () => {
    it('should have all TechManual terrain types', () => {
      expect(TerrainType.Clear).toBe('clear');
      expect(TerrainType.Pavement).toBe('pavement');
      expect(TerrainType.Road).toBe('road');
      expect(TerrainType.LightWoods).toBe('light_woods');
      expect(TerrainType.HeavyWoods).toBe('heavy_woods');
      expect(TerrainType.Rough).toBe('rough');
      expect(TerrainType.Rubble).toBe('rubble');
      expect(TerrainType.Water).toBe('water');
      expect(TerrainType.Sand).toBe('sand');
      expect(TerrainType.Mud).toBe('mud');
      expect(TerrainType.Snow).toBe('snow');
      expect(TerrainType.Ice).toBe('ice');
      expect(TerrainType.Swamp).toBe('swamp');
      expect(TerrainType.Building).toBe('building');
      expect(TerrainType.Bridge).toBe('bridge');
      expect(TerrainType.Fire).toBe('fire');
      expect(TerrainType.Smoke).toBe('smoke');
    });

    it('should have exactly 17 terrain types', () => {
      const types = Object.values(TerrainType);
      expect(types).toHaveLength(17);
    });
  });

  describe('CoverLevel enum', () => {
    it('should have all cover levels', () => {
      expect(CoverLevel.None).toBe('none');
      expect(CoverLevel.Partial).toBe('partial');
      expect(CoverLevel.Full).toBe('full');
    });

    it('should have exactly 3 cover levels', () => {
      const levels = Object.values(CoverLevel);
      expect(levels).toHaveLength(3);
    });
  });

  describe('TERRAIN_PROPERTIES constant', () => {
    it('should have properties for all terrain types', () => {
      const terrainTypes = Object.values(TerrainType);
      terrainTypes.forEach((type) => {
        expect(TERRAIN_PROPERTIES[type]).toBeDefined();
      });
    });

    it('should have exactly 17 terrain property entries', () => {
      const entries = Object.keys(TERRAIN_PROPERTIES);
      expect(entries).toHaveLength(17);
    });
  });

  describe('Clear terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Clear];

    it('should have zero movement cost modifiers', () => {
      expect(props.movementCostModifier.walk).toBe(0);
      expect(props.movementCostModifier.run).toBe(0);
      expect(props.movementCostModifier.jump).toBe(0);
      expect(props.movementCostModifier.tracked).toBe(0);
      expect(props.movementCostModifier.wheeled).toBe(0);
      expect(props.movementCostModifier.hover).toBe(0);
      expect(props.movementCostModifier.vtol).toBe(0);
    });

    it('should have zero to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(0);
    });

    it('should have no heat effect', () => {
      expect(props.heatEffect).toBe(0);
    });

    it('should provide no cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.None);
    });

    it('should not block LOS', () => {
      expect(props.blocksLOS).toBe(false);
      expect(props.losBlockHeight).toBe(0);
    });

    it('should not require PSR', () => {
      expect(props.requiresPSR).toBe(false);
    });

    it('should have no special rules', () => {
      expect(props.specialRules).toHaveLength(0);
    });
  });

  describe('Light Woods terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.LightWoods];

    it('should have +1 movement cost modifier for all movement types', () => {
      expect(props.movementCostModifier.walk).toBe(1);
      expect(props.movementCostModifier.run).toBe(1);
      expect(props.movementCostModifier.jump).toBe(1);
      expect(props.movementCostModifier.tracked).toBe(1);
      expect(props.movementCostModifier.wheeled).toBe(1);
      expect(props.movementCostModifier.hover).toBe(1);
      expect(props.movementCostModifier.vtol).toBe(0);
    });

    it('should have +1 to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(1);
      expect(props.toHitTargetInModifier).toBe(1);
    });

    it('should provide partial cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.Partial);
    });

    it('should not block LOS', () => {
      expect(props.blocksLOS).toBe(false);
    });
  });

  describe('Heavy Woods terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.HeavyWoods];

    it('should have +2 movement cost modifier for ground units', () => {
      expect(props.movementCostModifier.walk).toBe(2);
      expect(props.movementCostModifier.run).toBe(2);
      expect(props.movementCostModifier.jump).toBe(2);
      expect(props.movementCostModifier.tracked).toBe(2);
      expect(props.movementCostModifier.wheeled).toBe(2);
      expect(props.movementCostModifier.hover).toBe(2);
      expect(props.movementCostModifier.vtol).toBe(0);
    });

    it('should have +2 to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(2);
      expect(props.toHitTargetInModifier).toBe(2);
    });

    it('should provide full cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.Full);
    });

    it('should block LOS', () => {
      expect(props.blocksLOS).toBe(true);
      expect(props.losBlockHeight).toBe(1);
    });
  });

  describe('Water terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Water];

    it('should have +1 movement cost for ground units', () => {
      expect(props.movementCostModifier.walk).toBe(1);
      expect(props.movementCostModifier.tracked).toBe(1);
      expect(props.movementCostModifier.wheeled).toBe(1);
    });

    it('should have no movement cost for hover/vtol', () => {
      expect(props.movementCostModifier.hover).toBe(0);
      expect(props.movementCostModifier.vtol).toBe(0);
    });

    it('should have -1 to-hit modifier for target in water', () => {
      expect(props.toHitTargetInModifier).toBe(-1);
    });

    it('should have -2 heat effect', () => {
      expect(props.heatEffect).toBe(-2);
    });

    it('should provide partial cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.Partial);
    });

    it('should have depth-dependent special rule', () => {
      expect(props.specialRules).toContain('depth-dependent');
    });
  });

  describe('Rough terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Rough];

    it('should have +1 movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(1);
    });

    it('should have zero to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(0);
    });

    it('should provide no cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.None);
    });
  });

  describe('Rubble terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Rubble];

    it('should have +1 movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(1);
    });

    it('should have zero to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(0);
    });
  });

  describe('Sand terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Sand];

    it('should have +1 movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(1);
    });

    it('should have zero to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(0);
    });
  });

  describe('Mud terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Mud];

    it('should have +1 movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(1);
    });

    it('should have zero to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(0);
    });
  });

  describe('Snow terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Snow];

    it('should have zero movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(0);
    });

    it('should have zero to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(0);
    });

    it('should have depth-dependent special rule', () => {
      expect(props.specialRules).toContain('depth-dependent');
    });
  });

  describe('Ice terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Ice];

    it('should have zero movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(0);
    });

    it('should have zero to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(0);
    });

    it('should provide no cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.None);
    });
  });

  describe('Swamp terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Swamp];

    it('should have +2 movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(2);
    });

    it('should have zero intervening modifier but +1 target modifier', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(1);
    });

    it('should provide partial cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.Partial);
    });

    it('should not block LOS', () => {
      expect(props.blocksLOS).toBe(false);
    });
  });

  describe('Building terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Building];

    it('should have +1 movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(1);
    });

    it('should have +1 to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(1);
      expect(props.toHitTargetInModifier).toBe(1);
    });

    it('should provide partial cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.Partial);
    });

    it('should block LOS', () => {
      expect(props.blocksLOS).toBe(true);
      expect(props.losBlockHeight).toBe(1);
    });

    it('should have construction-factor-dependent special rule', () => {
      expect(props.specialRules).toContain('construction-factor-dependent');
    });
  });

  describe('Bridge terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Bridge];

    it('should have zero movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(0);
    });

    it('should have zero to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(0);
      expect(props.toHitTargetInModifier).toBe(0);
    });

    it('should provide no cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.None);
    });
  });

  describe('Fire terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Fire];

    it('should have zero movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(0);
    });

    it('should have +5 heat effect', () => {
      expect(props.heatEffect).toBe(5);
    });

    it('should have heat-damage special rule', () => {
      expect(props.specialRules).toContain('heat-damage');
    });

    it('should provide no cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.None);
    });
  });

  describe('Smoke terrain', () => {
    const props = TERRAIN_PROPERTIES[TerrainType.Smoke];

    it('should have zero movement cost modifier', () => {
      expect(props.movementCostModifier.walk).toBe(0);
    });

    it('should have +1 to-hit modifiers', () => {
      expect(props.toHitInterveningModifier).toBe(1);
      expect(props.toHitTargetInModifier).toBe(1);
    });

    it('should provide partial cover', () => {
      expect(props.coverLevel).toBe(CoverLevel.Partial);
    });

    it('should have density-dependent special rule', () => {
      expect(props.specialRules).toContain('density-dependent');
    });
  });

  describe('Pavement and Road terrain', () => {
    it('should have identical properties to Clear', () => {
      const clearProps = TERRAIN_PROPERTIES[TerrainType.Clear];
      const pavementProps = TERRAIN_PROPERTIES[TerrainType.Pavement];
      const roadProps = TERRAIN_PROPERTIES[TerrainType.Road];

      expect(pavementProps).toEqual(clearProps);
      expect(roadProps).toEqual(clearProps);
    });
  });

  describe('Movement cost modifiers', () => {
    it('should have all movement types defined for each terrain', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(props.movementCostModifier.walk).toBeDefined();
        expect(props.movementCostModifier.run).toBeDefined();
        expect(props.movementCostModifier.jump).toBeDefined();
        expect(props.movementCostModifier.tracked).toBeDefined();
        expect(props.movementCostModifier.wheeled).toBeDefined();
        expect(props.movementCostModifier.hover).toBeDefined();
        expect(props.movementCostModifier.vtol).toBeDefined();
      });
    });

    it('should have non-negative movement cost modifiers', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(props.movementCostModifier.walk).toBeGreaterThanOrEqual(0);
        expect(props.movementCostModifier.run).toBeGreaterThanOrEqual(0);
        expect(props.movementCostModifier.jump).toBeGreaterThanOrEqual(0);
        expect(props.movementCostModifier.tracked).toBeGreaterThanOrEqual(0);
        expect(props.movementCostModifier.wheeled).toBeGreaterThanOrEqual(0);
        expect(props.movementCostModifier.hover).toBeGreaterThanOrEqual(0);
        expect(props.movementCostModifier.vtol).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('To-hit modifiers', () => {
    it('should have to-hit modifiers defined for each terrain', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(typeof props.toHitInterveningModifier).toBe('number');
        expect(typeof props.toHitTargetInModifier).toBe('number');
      });
    });

    it('should have reasonable to-hit modifier ranges', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(props.toHitInterveningModifier).toBeGreaterThanOrEqual(-2);
        expect(props.toHitInterveningModifier).toBeLessThanOrEqual(3);
        expect(props.toHitTargetInModifier).toBeGreaterThanOrEqual(-2);
        expect(props.toHitTargetInModifier).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Heat effects', () => {
    it('should have heat effect defined for each terrain', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(typeof props.heatEffect).toBe('number');
      });
    });

    it('should have reasonable heat effect ranges', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(props.heatEffect).toBeGreaterThanOrEqual(-4);
        expect(props.heatEffect).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Cover levels', () => {
    it('should have valid cover level for each terrain', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect([CoverLevel.None, CoverLevel.Partial, CoverLevel.Full]).toContain(
          props.coverLevel
        );
      });
    });
  });

  describe('LOS blocking', () => {
    it('should have blocksLOS defined for each terrain', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(typeof props.blocksLOS).toBe('boolean');
      });
    });

    it('should have losBlockHeight >= 0', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(props.losBlockHeight).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have losBlockHeight > 0 only when blocksLOS is true', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        if (props.losBlockHeight > 0) {
          expect(props.blocksLOS).toBe(true);
        }
      });
    });
  });

  describe('Special rules', () => {
    it('should have specialRules array for each terrain', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(Array.isArray(props.specialRules)).toBe(true);
      });
    });

    it('should have specialRules as array', () => {
      Object.values(TerrainType).forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(Array.isArray(props.specialRules)).toBe(true);
      });
    });
  });

  describe('Interface compliance', () => {
    it('should create valid ITerrainFeature objects', () => {
      const feature: ITerrainFeature = {
        type: TerrainType.LightWoods,
        level: 1,
      };
      expect(feature.type).toBe(TerrainType.LightWoods);
      expect(feature.level).toBe(1);
    });

    it('should create valid ITerrainProperties objects', () => {
      const props = TERRAIN_PROPERTIES[TerrainType.Clear];
      expect(props.movementCostModifier).toBeDefined();
      expect(props.toHitInterveningModifier).toBeDefined();
      expect(props.coverLevel).toBeDefined();
    });

    it('should create valid IHexTerrain objects', () => {
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [
          {
            type: TerrainType.Clear,
            level: 0,
          },
        ],
      };
      expect(terrain.coordinate.q).toBe(0);
      expect(terrain.coordinate.r).toBe(0);
      expect(terrain.elevation).toBe(0);
      expect(terrain.features).toHaveLength(1);
    });
  });

  describe('VTOL movement', () => {
    it('should have zero movement cost for VTOL in most terrains', () => {
      const terrainTypesToCheck = [
        TerrainType.LightWoods,
        TerrainType.HeavyWoods,
        TerrainType.Rough,
        TerrainType.Rubble,
        TerrainType.Sand,
        TerrainType.Mud,
        TerrainType.Snow,
        TerrainType.Swamp,
        TerrainType.Building,
      ];

      terrainTypesToCheck.forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(props.movementCostModifier.vtol).toBe(0);
      });
    });
  });

  describe('Hover movement', () => {
    it('should have zero movement cost for hover in water', () => {
      const props = TERRAIN_PROPERTIES[TerrainType.Water];
      expect(props.movementCostModifier.hover).toBe(0);
    });

    it('should have movement cost for hover in difficult terrains', () => {
      const terrainTypesToCheck = [
        TerrainType.LightWoods,
        TerrainType.HeavyWoods,
        TerrainType.Rough,
        TerrainType.Rubble,
        TerrainType.Sand,
        TerrainType.Mud,
        TerrainType.Snow,
        TerrainType.Swamp,
        TerrainType.Building,
      ];

      terrainTypesToCheck.forEach((type) => {
        const props = TERRAIN_PROPERTIES[type];
        expect(props.movementCostModifier.hover).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
