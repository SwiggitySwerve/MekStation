import {
  GameEventType,
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';
import { ErrorCodeSchema } from '@/types/multiplayer/Protocol';

import {
  deriveTacticalLifecyclePosture,
  deriveTacticalWireFacts,
  projectionSignalFromServerError,
  type IClientLifecycleState,
  type TacticalLifecycleProjectionSignal,
} from '../tacticalLifecycleState';

const LIVE_CLIENT: IClientLifecycleState = {
  blockedBySequenceCollision: false,
  pendingIntentCount: 0,
  ready: true,
  reconnectScheduled: false,
  recoveringFromGap: false,
};

describe('tactical lifecycle posture', () => {
  it.each([
    ['pending', { client: { ...LIVE_CLIENT, pendingIntentCount: 1 } }],
    ['sealed', { sealedChoiceAwaitingReveal: true }],
    ['finalized', { finalizationLanded: true }],
    ['syncing', { client: { ...LIVE_CLIENT, recoveringFromGap: true } }],
    ['reconnecting', { client: { ...LIVE_CLIENT, reconnectScheduled: true } }],
    ['behind', { client: { ...LIVE_CLIENT, ready: false } }],
    [
      'blocked',
      { client: { ...LIVE_CLIENT, blockedBySequenceCollision: true } },
    ],
  ] as const)('derives %s from the client and wire signals', (state, patch) => {
    expect(
      deriveTacticalLifecyclePosture({
        finalizationLanded: false,
        projectionSignal: null,
        sealedChoiceAwaitingReveal: false,
        client: LIVE_CLIENT,
        ...patch,
      }).state,
    ).toBe(state);
  });

  it.each([
    ['rewound', 'PROJECTION_REWOUND'],
    ['rebuilding', 'PROJECTION_REBUILDING'],
  ] as const)(
    'derives the %s posture from the %s signal',
    (state, projectionSignal: TacticalLifecycleProjectionSignal) => {
      expect(
        deriveTacticalLifecyclePosture({
          client: LIVE_CLIENT,
          finalizationLanded: false,
          projectionSignal,
          sealedChoiceAwaitingReveal: false,
        }).state,
      ).toBe(state);
    },
  );

  it('never invents a projection posture from live client signals alone', () => {
    // A SWEEP, not one sample: the reviewer's routed-live-signal mutant
    // (recoveringFromGap answering 'rebuilding') survived a single-case
    // guard. Every live-signal combination must land on a live posture.
    // Since umbrella 19.2 3b-i the signal itself HAS a live producer -
    // a server PROJECTION_REBUILDING refusal - so what this row still
    // guards is narrower and more important: with no signal, transport
    // facts alone must never answer 'the projection is being rebuilt'.
    const liveVariants = [
      {},
      { pendingIntentCount: 1 },
      { ready: false },
      { recoveringFromGap: true },
      { blockedBySequenceCollision: true },
      { connected: false },
      { pendingIntentCount: 2, ready: false, recoveringFromGap: true },
    ] as const;
    for (const variant of liveVariants) {
      for (const sealed of [false, true]) {
        const posture = deriveTacticalLifecyclePosture({
          client: { ...LIVE_CLIENT, ...variant },
          finalizationLanded: false,
          projectionSignal: null,
          sealedChoiceAwaitingReveal: sealed,
        });
        expect(['rebuilding', 'rewound']).not.toContain(posture.state);
      }
    }
  });

  it("maps the server's PROJECTION_REBUILDING refusal into the rebuilding signal", () => {
    expect(projectionSignalFromServerError('PROJECTION_REBUILDING')).toBe(
      'PROJECTION_REBUILDING',
    );
    expect(
      deriveTacticalLifecyclePosture({
        client: LIVE_CLIENT,
        finalizationLanded: false,
        projectionSignal: projectionSignalFromServerError(
          'PROJECTION_REBUILDING',
        ),
        sealedChoiceAwaitingReveal: false,
      }).state,
    ).toBe('rebuilding');
  });

  it('gives no projection signal to any other server error code', () => {
    // A SWEEP over the real wire enum, not a sample: a mapper that
    // answered 'rebuilding' for every refusal would turn a rate-limit
    // into a frozen board.
    for (const code of ErrorCodeSchema.options) {
      if (code === 'PROJECTION_REBUILDING') continue;
      expect(projectionSignalFromServerError(code)).toBeNull();
    }
    expect(projectionSignalFromServerError(undefined)).toBeNull();
    expect(projectionSignalFromServerError('NOT_A_WIRE_CODE')).toBeNull();
  });

  it('has no wire code that could produce the rewound signal today', () => {
    // The honest half of 3b-i: `rewound` stays reachable-when-emitted
    // because the Error frame cannot carry PROJECTION_REWOUND at all -
    // it is not a member of the wire enum. When a producer lands, this
    // row fails and the mapper gains its second arm.
    expect(ErrorCodeSchema.options).not.toContain('PROJECTION_REWOUND');
    expect(projectionSignalFromServerError('PROJECTION_REWOUND')).toBeNull();
  });

  it('derives sealed until the actor-owned declaration is finalized', () => {
    const declaration = {
      actorId: 'unit-player',
      payload: { unitId: 'unit-player' },
      phase: GamePhase.Movement,
      sequence: 10,
      side: GameSide.Player,
      turn: 4,
      type: GameEventType.MovementDeclared,
    };
    const finalization = {
      payload: { fromPhase: GamePhase.Movement },
      phase: GamePhase.WeaponAttack,
      sequence: 11,
      turn: 4,
      type: GameEventType.PhaseChanged,
    };

    expect(deriveTacticalWireFacts([declaration], GameSide.Player)).toEqual({
      finalizationLanded: false,
      sealedChoiceAwaitingReveal: true,
    });
    expect(
      deriveTacticalWireFacts([declaration, finalization], GameSide.Player),
    ).toEqual({
      finalizationLanded: true,
      sealedChoiceAwaitingReveal: false,
    });
  });
});
