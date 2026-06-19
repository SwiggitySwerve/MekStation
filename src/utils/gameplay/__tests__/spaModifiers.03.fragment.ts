import { MovementType, RangeBracket } from '@/types/gameplay';
import { IAttackerState, ITargetState } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  calculateWeaponSpecialistModifier,
  calculateGunnerySpecialistModifier,
  calculateBloodStalkerModifier,
  calculateRangeMasterModifier,
  calculateSniperModifier,
  calculateMultiTaskerModifier,
  getClusterHitterBonus,
  calculateJumpingJackModifier,
  calculateDodgeManeuverModifier,
  calculateMeleeSpecialistModifier,
  calculateFrogmanPhysicalToHitModifier,
  calculateNeuralInterfacePilotingModifier,
  calculateGroundObjectLiftCapacity,
  calculateVdniRangedToHitModifier,
  calculateTerrainMasterDefensiveToHitModifier,
  calculateShakyStickModifier,
  checkGroundObjectLiftCapacity,
  getFrogmanWaterPSRModifier,
  getHeavyLifterGroundObjectLiftMultiplier,
  getMeleeMasterDamageBonus,
  getMeleeSpecialistDamageBonus,
  getMountaineerRubblePSRModifier,
  getTacticalGeniusBonus,
  getVdniPilotingModifier,
  getEffectiveWounds,
  getIronManModifier,
  getHotDogHeatTargetNumberModifier,
  getCoolUnderFireHeatReduction,
  getSomeLikeItHotHeatPenaltyReduction,
  createEdgeState,
  canUseEdge,
  deriveEdgePointCountFromPilotAbilities,
  useEdge,
  resolveEdgeBattleMechTrigger,
  IEdgeState,
  EdgeTriggerType,
  EDGE_TRIGGERS,
  OUT_OF_SCOPE_AEROSPACE_EDGE_TRIGGERS,
  REPRESENTED_BATTLEMECH_EDGE_TRIGGERS,
  SPA_CATALOG,
  getSPACatalogSize,
  getSPAsForPipeline,
  getSPAsByCategory,
  hasSPA,
  getConsciousnessCheckModifier,
  getObliqueAttackerBonus,
  getSharpshooterBonus,
  calculateAttackerSPAModifiers,
} from '../spaModifiers';
import { calculateToHit } from '../toHit';

describe('spaModifiers', () => {
  describe('Edge Trigger System', () => {
    it('defines all MegaMek Edge trigger types', () => {
      expect(Object.keys(EDGE_TRIGGERS)).toHaveLength(11);
    });

    it('includes all required trigger types', () => {
      const triggers: EdgeTriggerType[] = [
        'edge_when_headhit',
        'edge_when_tac',
        'edge_when_ko',
        'edge_when_explosion',
        'edge_when_masc_fails',
        'edge_when_aero_alt_loss',
        'edge_when_aero_explosion',
        'edge_when_aero_ko',
        'edge_when_aero_lucky_crit',
        'edge_when_aero_nuke_crit',
        'edge_when_aero_unit_cargo_lost',
      ];
      for (const trigger of triggers) {
        expect(EDGE_TRIGGERS[trigger]).toBeDefined();
      }
    });

    it('partitions Edge triggers into represented BattleMech and out-of-scope aerospace lanes', () => {
      expect(REPRESENTED_BATTLEMECH_EDGE_TRIGGERS).toEqual([
        'edge_when_headhit',
        'edge_when_tac',
        'edge_when_ko',
        'edge_when_explosion',
        'edge_when_masc_fails',
      ]);
      expect(OUT_OF_SCOPE_AEROSPACE_EDGE_TRIGGERS).toEqual([
        'edge_when_aero_alt_loss',
        'edge_when_aero_explosion',
        'edge_when_aero_ko',
        'edge_when_aero_lucky_crit',
        'edge_when_aero_nuke_crit',
        'edge_when_aero_unit_cargo_lost',
      ]);

      const partitionedTriggers = [
        ...REPRESENTED_BATTLEMECH_EDGE_TRIGGERS,
        ...OUT_OF_SCOPE_AEROSPACE_EDGE_TRIGGERS,
      ].sort();

      expect(new Set(partitionedTriggers).size).toBe(
        partitionedTriggers.length,
      );
      expect(partitionedTriggers).toEqual(Object.keys(EDGE_TRIGGERS).sort());
    });

    it('creates edge state with correct initial values', () => {
      const state = createEdgeState(2);
      expect(state.maxPoints).toBe(2);
      expect(state.remainingPoints).toBe(2);
      expect(state.usageHistory).toHaveLength(0);
    });

    it('derives generic Edge point count from explicit points or the generic edge ability only', () => {
      expect(deriveEdgePointCountFromPilotAbilities(['edge'])).toBe(1);
      expect(
        deriveEdgePointCountFromPilotAbilities(
          ['edge_when_headhit', 'edge_when_tac'],
          3,
        ),
      ).toBe(3);
      expect(
        deriveEdgePointCountFromPilotAbilities(['edge_when_headhit']),
      ).toBeUndefined();
    });

    it('allows edge use when points remain', () => {
      const state = createEdgeState(1);
      expect(canUseEdge(state, 'edge_when_tac')).toBe(true);
    });

    it('denies edge use when no points remain', () => {
      const state: IEdgeState = {
        maxPoints: 1,
        remainingPoints: 0,
        usageHistory: [],
      };
      expect(canUseEdge(state, 'edge_when_tac')).toBe(false);
    });

    it('denies edge use when state is undefined', () => {
      expect(canUseEdge(undefined, 'edge_when_tac')).toBe(false);
    });

    it('consumes an edge point on use', () => {
      const state = createEdgeState(2);
      const newState = useEdge(
        state,
        'edge_when_tac',
        1,
        'unit-1',
        'Rerolled TAC location',
      );
      expect(newState.remainingPoints).toBe(1);
      expect(newState.usageHistory).toHaveLength(1);
      expect(newState.usageHistory[0].trigger).toBe('edge_when_tac');
    });

    it('tracks multiple edge uses', () => {
      let state = createEdgeState(3);
      state = useEdge(state, 'edge_when_tac', 1, 'unit-1', 'TAC reroll');
      state = useEdge(state, 'edge_when_ko', 2, 'unit-1', 'KO reroll');
      expect(state.remainingPoints).toBe(1);
      expect(state.usageHistory).toHaveLength(2);
    });

    it('throws when using edge with no points', () => {
      const state: IEdgeState = {
        maxPoints: 1,
        remainingPoints: 0,
        usageHistory: [],
      };
      expect(() =>
        useEdge(state, 'edge_when_tac', 1, 'unit-1', 'test'),
      ).toThrow('No Edge points remaining');
    });

    it('spends Edge for a source-backed BattleMech trigger only when the resolver condition is true', () => {
      const result = resolveEdgeBattleMechTrigger({
        trigger: 'edge_when_headhit',
        edgeState: createEdgeState(1),
        pilotAbilities: ['edge_when_headhit'],
        shouldTrigger: true,
        turn: 3,
        unitId: 'target-1',
        description: 'Head-hit location reroll',
      });

      expect(result).toMatchObject({
        used: true,
        trigger: 'edge_when_headhit',
        edgePointsRemaining: 0,
      });
      expect(result.edgeState?.usageHistory).toEqual([
        {
          trigger: 'edge_when_headhit',
          turn: 3,
          unitId: 'target-1',
          description: 'Head-hit location reroll',
        },
      ]);
    });

    it('does not spend Edge when the runtime resolver has not proved the trigger condition', () => {
      const edgeState = createEdgeState(1);
      const result = resolveEdgeBattleMechTrigger({
        trigger: 'edge_when_tac',
        edgeState,
        pilotAbilities: ['edge_when_tac'],
        shouldTrigger: false,
        turn: 3,
        unitId: 'target-1',
        description: 'TAC location reroll',
      });

      expect(result).toEqual({
        used: false,
        trigger: 'edge_when_tac',
        edgeState,
        reason: 'condition-not-met',
      });
    });

    it('keeps each BattleMech Edge trigger gated by its matching ability id', () => {
      const edgeTriggers = [
        'edge_when_headhit',
        'edge_when_tac',
        'edge_when_ko',
        'edge_when_explosion',
      ] as const;

      for (const trigger of edgeTriggers) {
        const result = resolveEdgeBattleMechTrigger({
          trigger,
          edgeState: createEdgeState(1),
          pilotAbilities: edgeTriggers.filter((id) => id !== trigger),
          shouldTrigger: true,
          turn: 1,
          unitId: 'target-1',
          description: `${trigger} reroll`,
        });

        expect(result).toEqual({
          used: false,
          trigger,
          edgeState: expect.objectContaining({ remainingPoints: 1 }),
          reason: 'trigger-not-enabled',
        });
      }
    });

    it('does not spend BattleMech Edge trigger points when none remain', () => {
      const edgeState: IEdgeState = {
        maxPoints: 1,
        remainingPoints: 0,
        usageHistory: [],
      };
      const result = resolveEdgeBattleMechTrigger({
        trigger: 'edge_when_ko',
        edgeState,
        pilotAbilities: ['edge_when_ko'],
        shouldTrigger: true,
        turn: 4,
        unitId: 'target-1',
        description: 'KO reroll',
      });

      expect(result).toEqual({
        used: false,
        trigger: 'edge_when_ko',
        edgeState,
        reason: 'no-edge-available',
      });
    });
  });

  describe('SPA Catalog', () => {
    it('contains at least 35 entries', () => {
      expect(getSPACatalogSize()).toBeGreaterThanOrEqual(35);
    });

    it('includes all key combat SPAs', () => {
      const requiredSPAs = [
        'weapon-specialist',
        'gunnery-specialist',
        'blood-stalker',
        'sniper',
        'range-master',
        'cluster-hitter',
        'multi-tasker',
        'hopping-jack',
        'jumping-jack',
        'dodge-maneuver',
        'shaky_stick',
        'melee-specialist',
        'melee-master',
        'tactical-genius',
        'pain-resistance',
        'iron-man',
        'hot-dog',
        'edge',
      ];
      for (const id of requiredSPAs) {
        expect(SPA_CATALOG[id]).toBeDefined();
      }
    });

    it('returns SPAs for to-hit pipeline', () => {
      const toHitSPAs = getSPAsForPipeline('to-hit');
      expect(toHitSPAs.length).toBeGreaterThan(5);
      expect(toHitSPAs.some((s) => s.id === 'weapon-specialist')).toBe(true);
    });

    it('returns SPAs by category', () => {
      const gunnerySPAs = getSPAsByCategory('gunnery');
      expect(gunnerySPAs.length).toBeGreaterThan(3);
    });

    it('declares Sandblaster as a designated cluster-table damage SPA', () => {
      expect(SPA_CATALOG.sandblaster).toMatchObject({
        pipelines: ['damage'],
        combatEffect: expect.stringContaining('+4/+3/+2'),
        requiresDesignation: true,
        designationType: 'weapon_type',
      });
    });

    it('hasSPA correctly checks ability list', () => {
      expect(hasSPA(['weapon-specialist', 'sniper'], 'sniper')).toBe(true);
      expect(hasSPA(['weapon-specialist'], 'sniper')).toBe(false);
    });
  });

  describe('Consciousness check modifiers', () => {
    it('pain-resistance gives -1', () => {
      expect(getConsciousnessCheckModifier(['pain-resistance'])).toBe(-1);
    });

    it('iron-man gives no generic consciousness relief', () => {
      expect(getConsciousnessCheckModifier(['iron-man'])).toBe(0);
    });

    it('iron-will gives no generic consciousness relief', () => {
      expect(getConsciousnessCheckModifier(['iron-will'])).toBe(0);
    });

    it('toughness gives no SPA consciousness relief without numeric RPG Toughness state', () => {
      expect(getConsciousnessCheckModifier(['toughness'])).toBe(0);
    });
  });
});
