import type {
  IGmAuthorityContext,
  IGmCombatInterventionState,
  IGmCombatInterventionUnitState,
} from '@/types/interventions';

import {
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  type ITacticalCommandContext,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import {
  buildGmTacticalCommandIntent,
  createGmTacticalCommandPreview,
  GM_TACTICAL_PREVIEW_ACTION_ID,
  registerGmCombatInterventionImplementer,
} from '../index';
import { InterventionLedger } from '../InterventionLedger';

const gmAuthority: IGmAuthorityContext = {
  actorId: 'gm-1',
  role: 'gm',
  gameId: 'game-1',
  campaignId: 'campaign-1',
  ownedStateRefs: ['game:game-1', 'campaign:campaign-1'],
};

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'atlas-1',
    selectedUnitId: 'atlas-1',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    ...overrides,
  };
}

function makeState(): IGmCombatInterventionState {
  return {
    gameId: 'game-1',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    initiativeWinner: GameSide.Player,
    firstMover: GameSide.Player,
    activationIndex: 0,
    initiativeOrder: ['atlas-1'],
    activeUnitId: 'atlas-1',
    units: {
      'atlas-1': makeUnit('atlas-1'),
      'locust-1': makeUnit('locust-1'),
    },
    objectives: {
      '2,2': {
        id: 'objective-1',
        hexKey: '2,2',
        objectiveType: 'capture',
        owningSide: 'neutral',
        controlSide: 'neutral',
        controlRule: 'sole-occupancy',
        holdTurnsRequired: 2,
        holdProgress: 0,
      },
    },
    turnEvents: [],
  };
}

function makeUnit(id: string): IGmCombatInterventionUnitState {
  return {
    id,
    side: GameSide.Player,
    position: { q: 1, r: 1 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { head: 9, centerTorso: 30 },
    structure: { head: 3, centerTorso: 20 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: {
      engineHits: 0,
      gyroHits: 0,
      sensorHits: 0,
      lifeSupport: 0,
      cockpitHit: false,
      actuators: {},
      weaponsDestroyed: [],
      heatSinksDestroyed: 0,
      jumpJetsDestroyed: 0,
    },
  };
}

function makeLedger(): InterventionLedger<IGmCombatInterventionState> {
  return registerGmCombatInterventionImplementer(
    new InterventionLedger<IGmCombatInterventionState>(),
  );
}

describe('GmTacticalCommandPreviewAdapter', () => {
  it('builds structured preview intents for command descriptors', () => {
    expect(buildGmTacticalCommandIntent('gm.reload-unit', makeCtx())).toEqual({
      commandId: 'gm.reload-unit',
      activeUnitId: 'atlas-1',
      selectedUnitId: 'atlas-1',
      targetUnitId: null,
      phase: GamePhase.Movement,
    });
    expect(GM_TACTICAL_PREVIEW_ACTION_ID).toBe('gm-intervention.preview');
  });

  it('creates authorized combat previews through the cascade pipeline', () => {
    const preview = createGmTacticalCommandPreview({
      ledger: makeLedger(),
      state: makeState(),
      authority: gmAuthority,
      commandId: 'gm.advance-phase',
      ctx: makeCtx(),
      interventionId: 'gm-tactical-1',
      reason: 'Fix phase after table adjudication.',
    });

    expect(preview.status).toBe('ready');
    expect(preview.domain).toBe('combat');
    expect(preview.kind).toBe('fix');
    expect(preview.privateMetadata?.reason).toBe(
      'Fix phase after table adjudication.',
    );
    expect(preview.publicEffect?.summary).toContain('phase correction');
  });

  it.each([
    [
      'gm.set-position-facing',
      { family: 'reposition-facing', unitId: 'atlas-1', facing: Facing.South },
      'reposition-facing',
    ],
    [
      'gm.set-damage',
      {
        family: 'damage-critical',
        unitId: 'atlas-1',
        armor: { centerTorso: 24 },
      },
      'damage-critical',
    ],
    [
      'gm.set-heat-ammo',
      { family: 'heat-ammo', unitId: 'atlas-1', heat: 8 },
      'heat-ammo',
    ],
    [
      'gm.set-initiative',
      {
        family: 'turn-order',
        initiativeOrder: ['locust-1', 'atlas-1'],
        activeUnitId: 'locust-1',
      },
      'turn-order',
    ],
    [
      'gm.set-lifecycle',
      { family: 'lifecycle', unitId: 'atlas-1', lifecycle: 'rescued' },
      'lifecycle',
    ],
    [
      'gm.correct-attack',
      {
        family: 'attack-resolution',
        attackId: 'attack-1',
        attackerId: 'atlas-1',
        targetId: 'locust-1',
        weaponId: 'medium-laser-1',
        roll: 8,
        toHitNumber: 7,
        hit: true,
      },
      'attack-resolution',
    ],
    [
      'gm.set-objective',
      {
        family: 'objective-state',
        objectiveId: 'objective-1',
        patch: { controlSide: 'player', holdProgress: 1 },
      },
      'objective-state',
    ],
  ] as const)(
    'routes %s through a meaningful combat correction override',
    (commandId, combatCorrection, family) => {
      const preview = createGmTacticalCommandPreview({
        ledger: makeLedger(),
        state: makeState(),
        authority: gmAuthority,
        commandId,
        ctx: makeCtx({ targetUnitId: 'locust-1' }),
        combatCorrection,
      });

      expect(preview.status).toBe('ready');
      expect(preview.domain).toBe('combat');
      expect(preview.publicEffect).toMatchObject({ family });
      expect(preview.domainPayload).toMatchObject({
        correction: expect.objectContaining({ family }),
      });
    },
  );

  it.each([
    ['gm.set-position-facing', 'combat-reposition-facing-empty'],
    ['gm.set-damage', 'combat-damage-critical-empty'],
    ['gm.set-heat-ammo', 'combat-heat-ammo-empty'],
    ['gm.correct-attack', 'combat-attack-resolution-invalid'],
    ['gm.set-objective', 'combat-objective-marker-not-found'],
  ] as const)(
    'blocks incomplete default payloads for %s before approval',
    (commandId, conflictCode) => {
      const preview = createGmTacticalCommandPreview({
        ledger: makeLedger(),
        state: makeState(),
        authority: gmAuthority,
        commandId,
        ctx: makeCtx({ targetUnitId: 'locust-1' }),
      });

      expect(preview.status).toBe('blocked');
      expect(preview.conflicts).toContainEqual(
        expect.objectContaining({ code: conflictCode }),
      );
    },
  );

  it('routes tactical unit reload to the unit-reload intervention boundary', () => {
    const preview = createGmTacticalCommandPreview({
      ledger: makeLedger(),
      state: makeState(),
      authority: gmAuthority,
      commandId: 'gm.reload-unit',
      ctx: makeCtx(),
    });

    expect(preview.status).toBe('unsupported');
    expect(preview.domain).toBe('unit-reload');
    expect(preview.reason).toContain('unit-reload');
  });

  it('rejects shell-visible commands when service authority is not GM', () => {
    const preview = createGmTacticalCommandPreview({
      ledger: makeLedger(),
      state: makeState(),
      authority: { ...gmAuthority, role: 'player' },
      commandId: 'gm.set-damage',
      ctx: makeCtx(),
    });

    expect(preview.status).toBe('rejected');
    expect(preview.reason).toBe(
      'Only the owning GM can request GM intervention previews.',
    );
  });

  it('defers economy/resource corrections until the campaign implementer exists', () => {
    const state = makeState();
    const preview = createGmTacticalCommandPreview({
      ledger: makeLedger(),
      state,
      authority: gmAuthority,
      commandId: 'gm.grant-resource',
      ctx: makeCtx(),
    });

    expect(preview.status).toBe('deferred');
    expect(preview.domain).toBe('economy');
    expect(preview.projectedEvents).toEqual([]);
    expect(state.turn).toBe(1);
  });
});
