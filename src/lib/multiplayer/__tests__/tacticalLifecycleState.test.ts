import {
  GameEventType,
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  deriveTacticalLifecyclePosture,
  deriveTacticalWireFacts,
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
    'reserves the %s locator for the branch-owned %s signal',
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

  it('keeps branch-gated projection postures unreachable from live client signals', () => {
    // A SWEEP, not one sample: the reviewer's routed-live-signal mutant
    // (recoveringFromGap answering 'rebuilding') survived a single-case
    // guard. Every live-signal combination must land on a live posture.
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
