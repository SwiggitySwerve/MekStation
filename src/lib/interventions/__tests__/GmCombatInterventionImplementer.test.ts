import type {
  IGmAuthorityContext,
  IGmCombatInterventionCommandPayload,
  IGmCombatInterventionDomainPayload,
  IGmCombatInterventionState,
  IGmCombatInterventionUnitState,
  IGmCombatPublicEffect,
  IGmPrivateMetadata,
  IInterventionLedgerCommand,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import {
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import {
  applyGmCombatProjectedEffects,
  approveGmCascadePreview,
  createGmCascadePreview,
  projectCombatEffectsForRecord,
  projectInterventionRecordForPlayer,
  registerGmCombatInterventionImplementer,
} from '../index';
import { InterventionLedger } from '../InterventionLedger';

type CombatRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmCombatPublicEffect,
  IGmCombatInterventionDomainPayload
>;

const gmAuthority: IGmAuthorityContext = {
  actorId: 'gm-1',
  role: 'gm',
  gameId: 'game-1',
  ownedStateRefs: ['game:game-1'],
};

const componentDamage = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

function makeState(): IGmCombatInterventionState {
  return {
    gameId: 'game-1',
    status: GameStatus.Active,
    turn: 3,
    phase: GamePhase.Movement,
    initiativeWinner: GameSide.Player,
    firstMover: GameSide.Player,
    activationIndex: 0,
    initiativeOrder: ['atlas-1', 'locust-1'],
    activeUnitId: 'atlas-1',
    units: {
      'atlas-1': makeUnit('atlas-1', GameSide.Player),
      'locust-1': makeUnit('locust-1', GameSide.Opponent),
    },
    turnEvents: [],
  };
}

function makeUnit(
  id: string,
  side: GameSide,
  overrides: Partial<IGmCombatInterventionUnitState> = {},
): IGmCombatInterventionUnitState {
  return {
    id,
    side,
    position: { q: 1, r: 1 },
    facing: Facing.North,
    heat: 4,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      centerTorso: 30,
      leftArm: 16,
    },
    structure: {
      head: 3,
      centerTorso: 20,
      leftArm: 8,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {
      ac20: 5,
    },
    ammoState: {
      ac20Bin: {
        binId: 'ac20Bin',
        weaponType: 'AC/20',
        location: 'leftTorso',
        remainingRounds: 5,
        maxRounds: 5,
        isExplosive: true,
      },
    },
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage,
    ...overrides,
  };
}

function makeLedger(): InterventionLedger<IGmCombatInterventionState> {
  return registerGmCombatInterventionImplementer(
    new InterventionLedger<IGmCombatInterventionState>(),
  );
}

function makeCommand(
  payload: IGmCombatInterventionCommandPayload,
  overrides: Partial<
    IInterventionLedgerCommand<IGmCombatInterventionCommandPayload>
  > = {},
): IInterventionLedgerCommand<IGmCombatInterventionCommandPayload> {
  return {
    domain: 'combat',
    kind: 'fix',
    actorId: 'gm-1',
    targetRefs:
      payload.correction.family === 'turn-order'
        ? ['game:game-1:turn-order']
        : [`unit:${payload.correction.unitId}`],
    payload,
    causedBy: ['player-event-1'],
    ...overrides,
  };
}

function payload(
  correction: IGmCombatInterventionCommandPayload['correction'],
  publicSummary?: string,
): IGmCombatInterventionCommandPayload {
  return {
    correction,
    publicSummary,
    privateMetadata: {
      reason: 'Hidden GM adjudication reason.',
      defaultOutcome: 'The original result would remain.',
      hiddenNotes: 'Secret scenario branch stays private.',
    },
  };
}

function approveCommand(
  command: IInterventionLedgerCommand<IGmCombatInterventionCommandPayload>,
  state = makeState(),
): {
  readonly state: IGmCombatInterventionState;
  readonly record: CombatRecord;
} {
  const ledger = makeLedger();
  const preview = createGmCascadePreview({
    ledger,
    command,
    state,
    authority: gmAuthority,
    interventionId: `gm-int-${command.payload?.correction.family}`,
  });

  const result = approveGmCascadePreview({
    ledger,
    preview,
    state,
    createdAt: '2026-06-20T00:00:00.000Z',
    approvedAt: '2026-06-20T00:01:00.000Z',
  });

  expect(result.status).toBe('approved');
  if (result.status !== 'approved' || !result.record) {
    throw new Error('Expected combat GM intervention approval.');
  }

  return {
    state: result.state as IGmCombatInterventionState,
    record: result.record as CombatRecord,
  };
}

describe('GM combat intervention implementer', () => {
  it('registers the combat domain and leaves unregistered domains unsupported', () => {
    const ledger = makeLedger();
    const state = makeState();

    const preview = ledger.preview(
      makeCommand(
        payload({
          family: 'reposition-facing',
          unitId: 'atlas-1',
          position: { q: 3, r: 2 },
          facing: Facing.South,
        }),
      ),
      state,
    );
    const unsupported = ledger.preview(
      {
        domain: 'economy',
        kind: 'undo',
        actorId: 'gm-1',
        targetRefs: ['merchant-tx:1'],
      },
      state,
    );

    expect(preview.status).toBe('ready');
    expect(unsupported.status).toBe('unsupported');
  });

  it('previews and applies reposition/facing corrections with public-only player output', () => {
    const command = makeCommand(
      payload(
        {
          family: 'reposition-facing',
          unitId: 'atlas-1',
          position: { q: 5, r: 4 },
          facing: Facing.Southwest,
          secondaryFacing: Facing.Northwest,
        },
        'Atlas moved to hex 5,4 and facing corrected.',
      ),
    );

    const result = approveCommand(command);
    const unit = result.state.units['atlas-1'];
    const playerRecord = projectInterventionRecordForPlayer(result.record);

    expect(unit.position).toEqual({ q: 5, r: 4 });
    expect(unit.facing).toBe(Facing.Southwest);
    expect(unit.secondaryFacing).toBe(Facing.Northwest);
    expect(playerRecord.publicEffect).toMatchObject({
      summary: 'Atlas moved to hex 5,4 and facing corrected.',
      changedStateRefs: [
        'unit:atlas-1',
        'unit:atlas-1:position',
        'unit:atlas-1:facing',
        'unit:atlas-1:secondaryFacing',
      ],
    });
    expect(JSON.stringify(playerRecord)).not.toContain('Hidden GM');
    expect(JSON.stringify(playerRecord)).not.toContain('Secret scenario');
  });

  it('previews and applies damage and critical corrections traceably', () => {
    const correctedComponentDamage = {
      ...componentDamage,
      engineHits: 1,
      weaponsDestroyed: ['medium-laser-1'],
    };

    const result = approveCommand(
      makeCommand(
        payload({
          family: 'damage-critical',
          unitId: 'atlas-1',
          armor: { centerTorso: 21 },
          structure: { leftArm: 0 },
          componentDamage: correctedComponentDamage,
          destroyedLocations: ['leftArm'],
          destroyedEquipment: ['medium-laser-1'],
        }),
      ),
    );
    const unit = result.state.units['atlas-1'];

    expect(unit.armor.centerTorso).toBe(21);
    expect(unit.structure.leftArm).toBe(0);
    expect(unit.componentDamage?.engineHits).toBe(1);
    expect(unit.destroyedLocations).toEqual(['leftArm']);
    expect(unit.destroyedEquipment).toEqual(['medium-laser-1']);
    expect(result.record).toMatchObject({
      domain: 'combat',
      kind: 'fix',
      causedBy: ['player-event-1'],
      privateMetadata: {
        reason: 'Hidden GM adjudication reason.',
      },
    });
  });

  it('previews and applies heat and ammo corrections without leaking hidden reasoning', () => {
    const result = approveCommand(
      makeCommand(
        payload({
          family: 'heat-ammo',
          unitId: 'atlas-1',
          heat: 14,
          ammo: { ac20: 2 },
          ammoState: {
            ac20Bin: {
              binId: 'ac20Bin',
              weaponType: 'AC/20',
              location: 'leftTorso',
              remainingRounds: 2,
              maxRounds: 5,
              isExplosive: true,
            },
          },
        }),
      ),
    );
    const unit = result.state.units['atlas-1'];
    const playerRecord = projectInterventionRecordForPlayer(result.record);

    expect(unit.heat).toBe(14);
    expect(unit.ammo.ac20).toBe(2);
    expect(unit.ammoState?.ac20Bin.remainingRounds).toBe(2);
    expect(playerRecord.publicEffect.summary).toBe(
      'Unit atlas-1 heat/ammo corrected by the GM.',
    );
    expect(JSON.stringify(playerRecord)).not.toContain('defaultOutcome');
    expect(JSON.stringify(playerRecord)).not.toContain('hiddenNotes');
  });

  it('previews and applies phase, initiative, and turn ownership corrections', () => {
    const result = approveCommand(
      makeCommand(
        payload({
          family: 'turn-order',
          phase: GamePhase.WeaponAttack,
          initiativeWinner: GameSide.Opponent,
          firstMover: GameSide.Opponent,
          initiativeOrder: ['atlas-1', 'locust-1'],
          activeUnitId: 'locust-1',
        }),
      ),
    );

    expect(result.state.phase).toBe(GamePhase.WeaponAttack);
    expect(result.state.initiativeWinner).toBe(GameSide.Opponent);
    expect(result.state.firstMover).toBe(GameSide.Opponent);
    expect(result.state.activationIndex).toBe(1);
    expect(result.state.activeUnitId).toBe('locust-1');
  });

  it.each([
    ['ejected', { hasEjected: true }],
    ['withdrawing', { isWithdrawing: true, retreatTargetEdge: 'north' }],
    ['withdrawn', { hasRetreated: true }],
    ['disabled', { shutdown: true }],
    ['destroyed', { destroyed: true, destructionCause: 'damage' }],
    ['rescued', { rescued: true, hasRetreated: true }],
  ] as const)(
    'previews and applies %s lifecycle corrections',
    (lifecycle, expectedPatch) => {
      const result = approveCommand(
        makeCommand(
          payload({
            family: 'lifecycle',
            unitId: 'atlas-1',
            lifecycle,
            retreatTargetEdge:
              lifecycle === 'withdrawing' ? 'north' : undefined,
          }),
        ),
      );

      expect(result.state.units['atlas-1']).toMatchObject(expectedPatch);
      expect(result.record.publicEffect.summary).toBe(
        `Unit atlas-1 lifecycle state corrected to ${lifecycle}.`,
      );
    },
  );

  it.each([
    payload({
      family: 'reposition-facing',
      unitId: 'atlas-1',
      position: { q: 2, r: 3 },
      facing: Facing.Northeast,
    }),
    payload({
      family: 'damage-critical',
      unitId: 'atlas-1',
      armor: { head: 7 },
      structure: { centerTorso: 18 },
      componentDamage: { ...componentDamage, sensorHits: 1 },
    }),
    payload({
      family: 'heat-ammo',
      unitId: 'atlas-1',
      heat: 8,
      ammo: { ac20: 4 },
    }),
    payload({
      family: 'turn-order',
      phase: GamePhase.PhysicalAttack,
      initiativeOrder: ['locust-1', 'atlas-1'],
      activeUnitId: 'atlas-1',
    }),
    payload({
      family: 'lifecycle',
      unitId: 'atlas-1',
      lifecycle: 'rescued',
    }),
  ])('replays projected effects for %s corrections', (commandPayload) => {
    const state = makeState();
    const command = makeCommand(commandPayload);
    const approved = approveCommand(command, state);
    const replayed = applyGmCombatProjectedEffects(
      state,
      projectCombatEffectsForRecord(approved.record),
    );

    expect(replayed).toEqual(approved.state);
    expect(replayed.gmInterventionEvents).toHaveLength(1);
  });
});
