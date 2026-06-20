import type { IGameUnit } from '@/types/gameplay';
import type {
  IGmAuthorityContext,
  IGmPrivateMetadata,
  IGmUnitReloadInterventionCommandPayload,
  IGmUnitReloadInterventionDomainPayload,
  IGmUnitReloadInterventionState,
  IGmUnitReloadInterventionUnitState,
  IGmUnitReloadPublicEffect,
  IInterventionLedgerCommand,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
} from '@/types/gameplay';

import {
  applyGmUnitReloadProjectedEffects,
  approveGmCascadePreview,
  createGmCascadePreview,
  projectUnitReloadEffectsForRecord,
  registerGmUnitReloadInterventionImplementer,
} from '../index';
import { InterventionLedger } from '../InterventionLedger';

type UnitReloadRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmUnitReloadPublicEffect,
  IGmUnitReloadInterventionDomainPayload
>;

const gmAuthority: IGmAuthorityContext = {
  actorId: 'gm-1',
  role: 'gm',
  gameId: 'game-1',
  ownedStateRefs: ['game:game-1'],
};

const priorEvent = {
  id: 'prior-event-1',
} as IGmUnitReloadInterventionState['turnEvents'][number];

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

function makeState(
  overrides: Partial<IGmUnitReloadInterventionState> = {},
): IGmUnitReloadInterventionState {
  const atlasSession = makeSessionUnit();
  const locustSession = makeSessionUnit({
    id: 'locust-1',
    name: 'Locust LCT-1V',
    side: GameSide.Opponent,
    unitRef: 'locust-source',
    pilotRef: 'pilot-2',
    tonnage: 20,
    heatSinks: 10,
    ammoConstruction: [],
    weaponLocationById: {},
  });

  return {
    gameId: 'game-1',
    status: GameStatus.Active,
    turn: 4,
    phase: GamePhase.Movement,
    activationIndex: 1,
    initiativeWinner: GameSide.Player,
    firstMover: GameSide.Opponent,
    units: {
      'atlas-1': makeActiveUnit('atlas-1', GameSide.Player),
      'locust-1': makeActiveUnit('locust-1', GameSide.Opponent, {
        position: { q: -2, r: 1 },
        heat: 0,
      }),
    },
    sessionUnits: [atlasSession, locustSession],
    turnEvents: [priorEvent],
    ...overrides,
  };
}

function makeSessionUnit(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'atlas-1',
    name: 'Atlas AS7-D',
    side: GameSide.Player,
    unitRef: 'atlas-source',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    movementMode: 'walk',
    tonnage: 100,
    heatSinks: 10,
    heatSinkType: 'single',
    hasTSM: false,
    abilities: ['steady-hand'],
    weaponLocationById: {
      ac20: 'rightArm',
      mediumLaser: 'leftArm',
    },
    ammoConstruction: [
      {
        binId: 'ac20-bin',
        weaponType: 'AC/20',
        location: 'leftTorso',
        maxRounds: 5,
        damagePerRound: 20,
        isExplosive: true,
      },
    ],
    ...overrides,
  };
}

function makeSourceSnapshot(
  overrides: Partial<IGameUnit> = {},
  snapshotOverrides: {
    readonly armorLocations?: readonly string[];
    readonly structureLocations?: readonly string[];
    readonly ammoBinIds?: readonly string[];
  } = {},
) {
  return {
    unit: makeSessionUnit({
      id: 'catalog-atlas',
      name: 'Atlas AS7-K',
      heatSinks: 20,
      heatSinkType: 'double',
      hasTSM: true,
      weaponLocationById: {
        ac20: 'rightArm',
        mediumLaser: 'leftArm',
        gauss: 'rightTorso',
      },
      ...overrides,
    }),
    pilot: {
      gunnery: 3,
      piloting: 4,
      pilotSpas: ['maneuvering-ace'],
      abilities: ['maneuvering-ace'],
      pilotToughness: 1,
      edgePointsRemaining: 2,
      neuralInterfaceActive: true,
    },
    armorLocations: ['head', 'centerTorso', 'leftArm'],
    structureLocations: ['head', 'centerTorso', 'leftArm'],
    ammoBinIds: ['ac20-bin'],
    ...snapshotOverrides,
  };
}

function makeActiveUnit(
  id: string,
  side: GameSide,
  overrides: Partial<IGmUnitReloadInterventionUnitState> = {},
): IGmUnitReloadInterventionUnitState {
  return {
    id,
    side,
    position: { q: 3, r: 2 },
    facing: Facing.North,
    secondaryFacing: Facing.Northeast,
    heat: 8,
    movementThisTurn: MovementType.Run,
    hexesMovedThisTurn: 4,
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
    heatSinkType: 'single',
    hasTSM: false,
    armor: {
      head: 9,
      centerTorso: 25,
      leftArm: 12,
    },
    structure: {
      head: 3,
      centerTorso: 20,
      leftArm: 8,
    },
    startingInternalStructure: {
      head: 3,
      centerTorso: 31,
      leftArm: 17,
    },
    destroyedLocations: ['leftArm'],
    destroyedEquipment: ['mediumLaser'],
    ammo: {
      ac20: 2,
    },
    ammoState: {
      'ac20-bin': {
        binId: 'ac20-bin',
        weaponType: 'AC/20',
        location: 'leftTorso',
        remainingRounds: 2,
        maxRounds: 5,
        damagePerRound: 20,
        isExplosive: true,
      },
    },
    pilotWounds: 1,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Locked,
    componentDamage,
    weaponsFiredThisTurn: ['ac20'],
    edgePointsRemaining: 1,
    ...overrides,
  };
}

function makeLedger(): InterventionLedger<IGmUnitReloadInterventionState> {
  return registerGmUnitReloadInterventionImplementer(
    new InterventionLedger<IGmUnitReloadInterventionState>(),
  );
}

function makeCommand(
  payload: IGmUnitReloadInterventionCommandPayload,
  overrides: Partial<
    IInterventionLedgerCommand<IGmUnitReloadInterventionCommandPayload>
  > = {},
): IInterventionLedgerCommand<IGmUnitReloadInterventionCommandPayload> {
  return {
    domain: 'unit-reload',
    kind: 'reload',
    actorId: 'gm-1',
    targetRefs: [`unit:${payload.unitId}`],
    payload,
    causedBy: ['session-launch-1'],
    ...overrides,
  };
}

function payload(
  overrides: Partial<IGmUnitReloadInterventionCommandPayload> = {},
): IGmUnitReloadInterventionCommandPayload {
  return {
    unitId: 'atlas-1',
    sourceUnitsByRef: {
      'atlas-source': makeSourceSnapshot(),
    },
    privateMetadata: {
      reason: 'Hidden GM reload reason.',
      defaultOutcome: 'The stale encounter loadout would remain.',
      hiddenNotes: 'Catalog update should stay private.',
    },
    ...overrides,
  };
}

function previewReload(
  command: IInterventionLedgerCommand<IGmUnitReloadInterventionCommandPayload>,
  state = makeState(),
) {
  const ledger = makeLedger();
  return createGmCascadePreview({
    ledger,
    command,
    state,
    authority: gmAuthority,
    interventionId: 'gm-int-unit-reload',
  });
}

function approveReload(
  command: IInterventionLedgerCommand<IGmUnitReloadInterventionCommandPayload>,
  state = makeState(),
): {
  readonly state: IGmUnitReloadInterventionState;
  readonly record: UnitReloadRecord;
} {
  const ledger = makeLedger();
  const preview = createGmCascadePreview({
    ledger,
    command,
    state,
    authority: gmAuthority,
    interventionId: 'gm-int-unit-reload',
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
    throw new Error('Expected reload GM intervention approval.');
  }

  return {
    state: result.state as IGmUnitReloadInterventionState,
    record: result.record as UnitReloadRecord,
  };
}

describe('GM unit reload intervention implementer', () => {
  it('registers unit reload and previews source unit plus pilot data', () => {
    const preview = previewReload(makeCommand(payload()));

    expect(preview.status).toBe('ready');
    expect(preview.domainPayload).toMatchObject({
      reload: {
        unitId: 'atlas-1',
        unitRef: 'atlas-source',
        pilotRef: 'pilot-1',
      },
    });
    const event = preview.projectedEvents[0] as
      | undefined
      | { after?: { unit?: IGmUnitReloadInterventionUnitState } };
    expect(event?.after?.unit).toMatchObject({
      heatSinks: 20,
      heatSinkType: 'double',
      hasTSM: true,
      gunnery: 3,
      piloting: 4,
      abilities: ['maneuvering-ace'],
      pilotToughness: 1,
      neuralInterfaceActive: true,
    });
  });

  it('preserves compatible live overlays while replacing source-backed fields', () => {
    const start = makeState();
    const result = approveReload(makeCommand(payload()), start);
    const unit = result.state.units['atlas-1'];

    expect(unit).toMatchObject({
      heatSinks: 20,
      heatSinkType: 'double',
      hasTSM: true,
      position: { q: 3, r: 2 },
      facing: Facing.North,
      secondaryFacing: Facing.Northeast,
      heat: 8,
      movementThisTurn: MovementType.Run,
      lockState: LockState.Locked,
      pilotWounds: 1,
      pilotConscious: true,
      destroyedLocations: ['leftArm'],
      destroyedEquipment: ['mediumLaser'],
    });
    expect(unit.ammoState?.['ac20-bin'].remainingRounds).toBe(2);
    expect(
      result.state.sessionUnits?.find((entry) => entry.id === 'atlas-1'),
    ).toMatchObject({
      name: 'Atlas AS7-K',
      heatSinks: 20,
      gunnery: 3,
      piloting: 4,
    });
  });

  it('requires manual takeover for incompatible reload conflicts before commit', () => {
    const command = makeCommand(
      payload({
        sourceUnitsByRef: {
          'atlas-source': makeSourceSnapshot(
            {
              ammoConstruction: [
                {
                  binId: 'gauss-bin',
                  weaponType: 'Gauss Rifle',
                  location: 'rightTorso',
                  maxRounds: 8,
                  damagePerRound: 15,
                  isExplosive: true,
                },
              ],
            },
            { ammoBinIds: ['gauss-bin'] },
          ),
        },
      }),
    );
    const state = makeState();
    const ledger = makeLedger();
    const preview = createGmCascadePreview({
      ledger,
      command,
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-conflict',
    });
    const result = approveGmCascadePreview({ ledger, preview, state });

    expect(preview.status).toBe('requires-manual-takeover');
    expect(preview.conflicts.map((conflict) => conflict.code)).toContain(
      'unit-reload-ammo-bin-removed',
    );
    expect(result).toMatchObject({
      status: 'blocked',
      appended: false,
    });
  });

  it('allows approved manual conflict handling and removes incompatible live bins', () => {
    const command = makeCommand(
      payload({
        sourceUnitsByRef: {
          'atlas-source': makeSourceSnapshot(
            {
              ammoConstruction: [
                {
                  binId: 'gauss-bin',
                  weaponType: 'Gauss Rifle',
                  location: 'rightTorso',
                  maxRounds: 8,
                  damagePerRound: 15,
                  isExplosive: true,
                },
              ],
            },
            { ammoBinIds: ['gauss-bin'] },
          ),
        },
        manualResolution: {
          acceptedConflictCodes: ['unit-reload-ammo-bin-removed'],
          notes: 'GM accepts removing the stale AC/20 bin.',
        },
      }),
    );
    const result = approveReload(command);
    const unit = result.state.units['atlas-1'];

    expect(unit.ammoState?.['ac20-bin']).toBeUndefined();
    expect(unit.ammoState?.['gauss-bin']).toMatchObject({
      weaponType: 'Gauss Rifle',
      remainingRounds: 8,
    });
    expect(result.record.privateMetadata.manualTakeoverNotes).toBe(
      'GM accepts removing the stale AC/20 bin.',
    );
  });

  it('updates only the target unit and preserves encounter state plus history', () => {
    const start = makeState();
    const result = approveReload(makeCommand(payload()), start);
    const replayed = applyGmUnitReloadProjectedEffects(
      start,
      projectUnitReloadEffectsForRecord(result.record),
    );

    expect(result.state.status).toBe(GameStatus.Active);
    expect(result.state.phase).toBe(GamePhase.Movement);
    expect(result.state.activationIndex).toBe(1);
    expect(result.state.turnEvents).toEqual([priorEvent]);
    expect(result.state.units['locust-1']).toBe(start.units['locust-1']);
    expect(
      result.state.sessionUnits?.find((unit) => unit.id === 'locust-1'),
    ).toBe(start.sessionUnits?.[1]);
    expect(result.state.gmUnitReloadEvents).toHaveLength(1);
    expect(replayed).toEqual(result.state);
  });
});
