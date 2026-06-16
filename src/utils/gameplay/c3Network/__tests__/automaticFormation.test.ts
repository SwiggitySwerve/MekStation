import { RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT } from '@/simulation/runner/CombatRuleSupport';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IUnitGameState,
} from '@/types/gameplay';

import {
  buildConservativeC3NetworkStateFromUnits,
  evaluateConservativeC3NetworkFormationFromUnits,
} from '../automaticFormation';
import { C3I_MAX_UNITS, C3_NOVA_MAX_UNITS, type C3UnitRole } from '../types';

function buildUnit(
  id: string,
  side: GameSide,
  roles: readonly C3UnitRole[],
  abilities: readonly string[] = [],
): IUnitGameState {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...(abilities.length > 0 ? { abilities } : {}),
    ...(roles.length > 0
      ? {
          c3Equipment: roles.map((role, index) => ({
            role,
            sourceEquipmentId: `${id}-${role}-${index}`,
          })),
        }
      : {}),
  };
}

describe('evaluateConservativeC3NetworkFormationFromUnits', () => {
  it('forms a single unambiguous mounted C3 master/slave network', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      master: buildUnit('master', GameSide.Player, ['master']),
      slave: buildUnit('slave', GameSide.Player, ['slave']),
      opponent: buildUnit('opponent', GameSide.Opponent, []),
    });

    expect(result.denials).toEqual([]);
    expect(result.state?.networks).toHaveLength(1);
    expect(result.state?.networks[0]).toMatchObject({
      networkId: 'player-c3-master-slave-1',
      type: 'master-slave',
      teamId: GameSide.Player,
    });
    expect(
      result.state?.networks[0].members.map((member) => member.role),
    ).toEqual(['master', 'slave']);
  });

  it('forms a single unambiguous mounted C3i peer network', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      c3iA: buildUnit('c3iA', GameSide.Player, ['c3i']),
      c3iB: buildUnit('c3iB', GameSide.Player, ['c3i']),
      opponent: buildUnit('opponent', GameSide.Opponent, []),
    });

    expect(result.denials).toEqual([]);
    expect(result.state?.networks).toHaveLength(1);
    expect(result.state?.networks[0]).toMatchObject({
      networkId: 'player-c3i-1',
      type: 'improved',
      teamId: GameSide.Player,
    });
    expect(
      result.state?.networks[0].members.map((member) => member.role),
    ).toEqual(['c3i', 'c3i']);
  });

  it('forms a single unambiguous Boosted Comm Implant C3i peer network', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      implantA: buildUnit(
        'implantA',
        GameSide.Player,
        [],
        ['boost_comm_implant'],
      ),
      implantB: buildUnit(
        'implantB',
        GameSide.Player,
        [],
        ['boost_comm_implant'],
      ),
      opponent: buildUnit('opponent', GameSide.Opponent, []),
    });

    expect(result.denials).toEqual([]);
    expect(result.state?.networks).toHaveLength(1);
    expect(result.state?.networks[0]).toMatchObject({
      networkId: 'player-c3i-1',
      type: 'improved',
      teamId: GameSide.Player,
    });
    expect(
      result.state?.networks[0].members.map((member) => member.role),
    ).toEqual(['c3i', 'c3i']);
  });

  it('keeps singleton Boosted Comm Implant C3i access non-networked', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      implant: buildUnit(
        'implant',
        GameSide.Player,
        [],
        ['boost_comm_implant'],
      ),
    });

    expect(result.state).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'insufficient-c3i-members',
        unitIds: ['implant'],
        roles: ['c3i'],
      }),
    ]);
  });

  it('forms a single unambiguous mounted Nova CEWS peer network', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      novaA: buildUnit('novaA', GameSide.Player, ['nova']),
      novaB: buildUnit('novaB', GameSide.Player, ['nova']),
      opponent: buildUnit('opponent', GameSide.Opponent, []),
    });

    expect(result.denials).toEqual([]);
    expect(result.state?.networks).toHaveLength(1);
    expect(result.state?.networks[0]).toMatchObject({
      networkId: 'player-nova-cews-1',
      type: 'nova',
      teamId: GameSide.Player,
    });
    expect(
      result.state?.networks[0].members.map((member) => member.role),
    ).toEqual(['nova', 'nova']);
  });

  it('keeps automatic formation isolated per side when one side needs authored assignment', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      playerMaster: buildUnit('playerMaster', GameSide.Player, ['master']),
      playerSlave: buildUnit('playerSlave', GameSide.Player, ['slave']),
      opponentAmbiguous: buildUnit('opponentAmbiguous', GameSide.Opponent, [
        'master',
        'slave',
      ]),
    });

    expect(result.state?.networks).toHaveLength(1);
    expect(result.state?.networks[0]).toMatchObject({
      networkId: 'player-c3-master-slave-1',
      type: 'master-slave',
      teamId: GameSide.Player,
    });
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Opponent,
        reason: 'ambiguous-unit-equipment',
        unitIds: ['opponentAmbiguous'],
        roles: ['master', 'slave'],
      }),
    ]);
  });

  it('explicitly denies ambiguous mounted roles instead of guessing membership', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      ambiguous: buildUnit('ambiguous', GameSide.Player, ['master', 'slave']),
      slave: buildUnit('slave', GameSide.Player, ['slave']),
    });

    expect(result.state).toBeUndefined();
    expect(
      buildConservativeC3NetworkStateFromUnits({
        ambiguous: buildUnit('ambiguous', GameSide.Player, ['master', 'slave']),
        slave: buildUnit('slave', GameSide.Player, ['slave']),
      }),
    ).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'ambiguous-unit-equipment',
        unitIds: ['ambiguous'],
        roles: ['master', 'slave'],
      }),
    ]);
  });

  it('explicitly denies mixed C3-family equipment families on one side', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      master: buildUnit('master', GameSide.Player, ['master']),
      slave: buildUnit('slave', GameSide.Player, ['slave']),
      c3iA: buildUnit('c3iA', GameSide.Player, ['c3i']),
      c3iB: buildUnit('c3iB', GameSide.Player, ['c3i']),
      nova: buildUnit('nova', GameSide.Player, ['nova']),
    });

    expect(result.state).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'mixed-network-families',
        unitIds: ['c3iA', 'c3iB', 'master', 'nova', 'slave'],
        roles: ['master', 'slave', 'c3i', 'nova'],
      }),
    ]);
  });

  it('explicitly denies multiple mounted masters instead of assigning slaves', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      masterA: buildUnit('masterA', GameSide.Player, ['master']),
      masterB: buildUnit('masterB', GameSide.Player, ['master']),
      slave: buildUnit('slave', GameSide.Player, ['slave']),
    });

    expect(result.state).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'multiple-master-units',
        unitIds: ['masterA', 'masterB'],
        roles: ['master'],
      }),
    ]);
  });

  it('explicitly denies singleton mounted C3i equipment instead of forming a non-beneficial network', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      c3i: buildUnit('c3i', GameSide.Player, ['c3i']),
    });

    expect(result.state).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'insufficient-c3i-members',
        unitIds: ['c3i'],
        roles: ['c3i'],
      }),
    ]);
  });

  it('explicitly denies singleton mounted Nova CEWS equipment instead of forming a non-beneficial network', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      nova: buildUnit('nova', GameSide.Player, ['nova']),
    });

    expect(result.state).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'insufficient-nova-members',
        unitIds: ['nova'],
        roles: ['nova'],
      }),
    ]);
  });

  it('explicitly denies incomplete mounted master/slave equipment instead of guessing a partner', () => {
    const masterOnly = evaluateConservativeC3NetworkFormationFromUnits({
      master: buildUnit('master', GameSide.Player, ['master']),
    });
    const slaveOnly = evaluateConservativeC3NetworkFormationFromUnits({
      slave: buildUnit('slave', GameSide.Player, ['slave']),
    });

    expect(masterOnly.state).toBeUndefined();
    expect(masterOnly.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'incomplete-master-slave-network',
        unitIds: ['master'],
        roles: ['master'],
      }),
    ]);
    expect(slaveOnly.state).toBeUndefined();
    expect(slaveOnly.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'incomplete-master-slave-network',
        unitIds: ['slave'],
        roles: ['slave'],
      }),
    ]);
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-denial-boundaries']
        .evidence,
    ).toContain('incomplete pairs');
  });

  it('keeps the broad C3 equipment formation catalog row bounded to out-of-scope residual coverage', () => {
    const denialBoundarySupport =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-denial-boundaries'];
    const independentSideFormationSupport =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'c3-equipment-independent-side-formation'
      ];
    const support =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-network-formation'];

    expect(denialBoundarySupport).toMatchObject({
      id: 'c3-equipment-denial-boundaries',
      level: 'integrated',
      evidence: expect.stringContaining(
        'explicitly denies ambiguous multi-role equipment, mixed C3i/master-slave families, multiple masters, oversized master/slave groups, oversized C3i groups, incomplete pairs, and singleton C3i without guessing player intent',
      ),
    });
    expect(independentSideFormationSupport).toMatchObject({
      id: 'c3-equipment-independent-side-formation',
      level: 'integrated',
      evidence: expect.stringContaining(
        'evaluates mounted C3 equipment independently per side',
      ),
    });
    expect(support).toMatchObject({
      id: 'c3-equipment-network-formation',
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'represented BattleMech C3 runtime behavior is covered by explicit session-authored IGameState.c3Network consumption, mounted equipment role hydration, conservative single-network seeding, unambiguous per-side C3/C3i formation, independent side-by-side formation/denial evaluation, and fail-closed denial boundaries',
      ),
      gap: expect.stringContaining(
        'Manual C3 network authoring UI, manual C3 assignment controls, automatic same-side multiple-network partitioning, ambiguous multiple-master partitioning, mixed C3i/master-slave family selection, and authoritative oversized network splitting are outside this BattleMech runtime to-hit validation slice',
      ),
    });
    expect(support.evidence).toContain(
      'this broad row intentionally does not claim authored network assignment or partitioning support',
    );
  });

  it('explicitly denies oversized mounted C3i groups instead of splitting networks', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits(
      Object.fromEntries(
        Array.from({ length: C3I_MAX_UNITS + 1 }, (_, index) => {
          const unitId = `c3i-${index + 1}`;
          return [unitId, buildUnit(unitId, GameSide.Player, ['c3i'])];
        }),
      ),
    );

    expect(result.state).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'oversized-c3i-network',
        unitIds: [
          'c3i-1',
          'c3i-2',
          'c3i-3',
          'c3i-4',
          'c3i-5',
          'c3i-6',
          'c3i-7',
        ],
        roles: ['c3i'],
      }),
    ]);
  });

  it('explicitly denies oversized mounted Nova CEWS groups instead of splitting networks', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits(
      Object.fromEntries(
        Array.from({ length: C3_NOVA_MAX_UNITS + 1 }, (_, index) => {
          const unitId = `nova-${index + 1}`;
          return [unitId, buildUnit(unitId, GameSide.Player, ['nova'])];
        }),
      ),
    );

    expect(result.state).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'oversized-nova-network',
        unitIds: ['nova-1', 'nova-2', 'nova-3', 'nova-4'],
        roles: ['nova'],
      }),
    ]);
  });

  it('explicitly denies oversized mounted master/slave groups', () => {
    const result = evaluateConservativeC3NetworkFormationFromUnits({
      master: buildUnit('master', GameSide.Player, ['master']),
      slaveA: buildUnit('slaveA', GameSide.Player, ['slave']),
      slaveB: buildUnit('slaveB', GameSide.Player, ['slave']),
      slaveC: buildUnit('slaveC', GameSide.Player, ['slave']),
      slaveD: buildUnit('slaveD', GameSide.Player, ['slave']),
    });

    expect(result.state).toBeUndefined();
    expect(result.denials).toEqual([
      expect.objectContaining({
        teamId: GameSide.Player,
        reason: 'oversized-master-slave-network',
        unitIds: ['master', 'slaveA', 'slaveB', 'slaveC', 'slaveD'],
        roles: ['master', 'slave'],
      }),
    ]);
  });
});
