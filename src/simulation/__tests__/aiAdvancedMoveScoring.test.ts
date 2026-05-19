/**
 * Tests for A4 advanced-systems move scoring.
 *
 * Covers the `scoreMove` advanced terms — jump tactics, ECM advice, and
 * vision advice — gated on `advancedSystems`. Maps to `add-ai-advanced-systems`
 * tasks 5.1–5.3 and the requirement scenarios "Bot avoids a hostile ECM
 * bubble", "ECM carrier is rewarded for covering the lance", and "Bot
 * repositions to scout an unspotted enemy".
 *
 * @spec openspec/changes/add-ai-advanced-systems/specs/simulation-system/spec.md
 *   Requirement: AI Electronic-Warfare Awareness
 *   Requirement: AI Spotting and Vision Awareness
 *   Requirement: AI Jump-Jet Tactics
 */

import type { IHex, IHexCoordinate, IHexGrid } from '@/types/gameplay';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import { Facing, MovementType } from '@/types/gameplay';

import type { IElectronicWarfareContext } from '../ai/AIElectronicWarfareAdvisor';
import type { IVisionContext } from '../ai/AIVisionAdvisor';
import type { IAIUnitState, IMove } from '../ai/types';

import {
  getTierParameters,
  resolveAdvancedParameters,
} from '../ai/AITierRegistry';
import { scoreMove, type IScoreMoveContext } from '../ai/MoveAI';

function buildGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: null,
        terrain: 'clear',
        elevation: 0,
      });
    }
  }
  return { config: { radius }, hexes };
}

function makeUnit(
  overrides: Partial<IAIUnitState> & { unitId: string },
): IAIUnitState {
  return {
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [],
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

function makeMove(
  overrides: Partial<IMove> & { destination: IHexCoordinate },
): IMove {
  return {
    facing: Facing.North,
    movementType: MovementType.Walk,
    mpCost: 1,
    heatGenerated: 1,
    ...overrides,
  };
}

const ELITE_ADVANCED = resolveAdvancedParameters(getTierParameters('Elite'));
const VETERAN_ADVANCED = resolveAdvancedParameters(
  getTierParameters('Veteran'),
);

describe('A4 advanced move scoring — ECM avoidance', () => {
  it('an Elite bot scores a hex outside a hostile ECM bubble higher', () => {
    // Two destinations equidistant from the single enemy so LOS and
    // closing-distance terms are equal — only the ECM term separates them.
    const grid = buildGrid(20);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 0 } });

    const ewState: IElectronicWarfareState = {
      ecmSuites: [
        {
          type: 'guardian',
          mode: 'ecm',
          operational: true,
          entityId: 'enemy-ecm',
          teamId: 'enemy',
          position: { q: 8, r: 0 },
        },
      ],
      activeProbes: [],
    };
    const electronicWarfare: IElectronicWarfareContext = {
      movingUnitTeamId: 'friendly',
      ewState,
    };

    const insideBubble = { q: 6, r: 0 }; // within radius 6 of ECM at (8,0)
    const outsideBubble = { q: -6, r: 0 }; // far from the ECM
    // Both are hex-distance 6 from the enemy at the origin.

    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      tierAdvanced: ELITE_ADVANCED,
      electronicWarfare,
    };

    const inside = scoreMove(makeMove({ destination: insideBubble }), ctx);
    const outside = scoreMove(makeMove({ destination: outsideBubble }), ctx);

    expect(outside).toBeGreaterThan(inside);
  });

  it('a Veteran bot is unaffected by the ECM term', () => {
    const grid = buildGrid(20);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 0 } });
    const ewState: IElectronicWarfareState = {
      ecmSuites: [
        {
          type: 'guardian',
          mode: 'ecm',
          operational: true,
          entityId: 'enemy-ecm',
          teamId: 'enemy',
          position: { q: 8, r: 0 },
        },
      ],
      activeProbes: [],
    };
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      tierAdvanced: VETERAN_ADVANCED,
      electronicWarfare: { movingUnitTeamId: 'friendly', ewState },
    };

    const inside = scoreMove(makeMove({ destination: { q: 6, r: 0 } }), ctx);
    const outside = scoreMove(makeMove({ destination: { q: -6, r: 0 } }), ctx);

    // Veteran disables advanced systems — both score equally (the ECM term
    // contributes nothing).
    expect(inside).toBe(outside);
  });
});

describe('A4 advanced move scoring — ECM coverage', () => {
  it('an Elite ECM carrier scores a lance-covering hex higher', () => {
    const grid = buildGrid(30);
    const carrier = makeUnit({ unitId: 'carrier', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 0 } });
    const mate1 = makeUnit({ unitId: 'm1', position: { q: 12, r: 0 } });
    const mate2 = makeUnit({ unitId: 'm2', position: { q: 12, r: -2 } });

    const ewState: IElectronicWarfareState = {
      ecmSuites: [
        {
          type: 'guardian',
          mode: 'ecm',
          operational: true,
          entityId: 'carrier',
          teamId: 'friendly',
          position: { q: 0, r: 0 },
        },
      ],
      activeProbes: [],
    };
    const ctx: IScoreMoveContext = {
      attacker: carrier,
      allUnits: [carrier, enemy],
      grid,
      tierAdvanced: ELITE_ADVANCED,
      electronicWarfare: {
        movingUnitTeamId: 'friendly',
        ewState,
        lancemates: [mate1, mate2],
      },
    };

    // A destination beside the lancemates covers both with its bubble; one
    // far from them covers neither. Both equidistant from the enemy.
    const covering = scoreMove(
      makeMove({ destination: { q: 12, r: -1 } }),
      ctx,
    );
    const notCovering = scoreMove(
      makeMove({ destination: { q: -12, r: 1 } }),
      ctx,
    );

    expect(covering).toBeGreaterThan(notCovering);
  });
});

describe('A4 advanced move scoring — vision / scouting', () => {
  it('an Elite bot scores a destination that scouts an unspotted enemy higher', () => {
    const grid = buildGrid(30);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    // Enemy 20 hexes away — beyond sensor range, unspotted.
    const enemy = makeUnit({ unitId: 'e', position: { q: 20, r: 0 } });

    const vision: IVisionContext = { grid, enemies: [enemy] };
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      tierAdvanced: ELITE_ADVANCED,
      vision,
    };

    // A destination within sensor range of the enemy newly spots it; the
    // closing-distance term also favors it, and the scout bonus adds on top.
    const scouting = scoreMove(makeMove({ destination: { q: 12, r: 0 } }), ctx);
    // Same destination scored WITHOUT the vision term (Veteran) — the
    // difference is exactly the scout bonus contribution.
    const veteranCtx: IScoreMoveContext = {
      ...ctx,
      tierAdvanced: VETERAN_ADVANCED,
    };
    const veteranScore = scoreMove(
      makeMove({ destination: { q: 12, r: 0 } }),
      veteranCtx,
    );

    expect(scouting).toBeGreaterThan(veteranScore);
  });

  it('a Veteran bot is unaffected by the vision term', () => {
    const grid = buildGrid(30);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 20, r: 0 } });
    const ctxBase = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      vision: { grid, enemies: [enemy] },
    };

    const withVisionField = scoreMove(
      makeMove({ destination: { q: 12, r: 0 } }),
      {
        ...ctxBase,
        tierAdvanced: VETERAN_ADVANCED,
      },
    );
    const noAdvancedBlock = scoreMove(
      makeMove({ destination: { q: 12, r: 0 } }),
      ctxBase,
    );

    // A Veteran tier and a ctx with no advanced block both produce the same
    // score — the vision term contributes nothing without `advancedSystems`.
    expect(withVisionField).toBe(noAdvancedBlock);
  });
});

describe('A4 advanced move scoring — jump tactics term', () => {
  it('an Elite bot lifts a jump move by its weighted jump-evaluation score', () => {
    const grid = buildGrid(20);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 5 } });

    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      tierAdvanced: ELITE_ADVANCED,
      jumpEvaluationScore: 600,
    };

    const jumpMove = makeMove({
      destination: { q: 2, r: 0 },
      movementType: MovementType.Jump,
    });
    const walkMove = makeMove({
      destination: { q: 2, r: 0 },
      movementType: MovementType.Walk,
    });

    const jumpScore = scoreMove(jumpMove, ctx);
    const walkScore = scoreMove(walkMove, ctx);

    // The jump term applies to jump moves only — the jump move scores higher
    // by `jumpTacticsWeight * jumpEvaluationScore` (minus the small extra
    // jump heat). With weight 1 and score 600 the jump clearly wins.
    expect(jumpScore).toBeGreaterThan(walkScore);
  });

  it('does not apply the jump term to a jump move on a Veteran tier', () => {
    const grid = buildGrid(20);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 5 } });
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      tierAdvanced: VETERAN_ADVANCED,
      jumpEvaluationScore: 600,
    };

    const jumpMove = makeMove({
      destination: { q: 2, r: 0 },
      movementType: MovementType.Jump,
    });
    const ctxNoAdvanced: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
    };

    // The Veteran score equals the no-advanced-block score — the jump term
    // contributes nothing.
    expect(scoreMove(jumpMove, ctx)).toBe(scoreMove(jumpMove, ctxNoAdvanced));
  });
});
