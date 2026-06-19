import type { IGameIntent } from './combatActionCatalog.test-helpers';

import {
  activateMovementEnhancementIntent,
  concedeIntent,
  declareAttackIntent,
  declareMovementIntent,
  declarePhysicalIntent,
  ejectIntent,
  endPhaseIntent,
  goProneIntent,
  requestSpotIntent,
  standIntent,
  toServerIntent,
  torsoTwistIntent,
  withdrawIntent,
  GameSide,
  GAME_INTENT_TYPES,
  COMBAT_DIRECT_UI_ACTION_SUPPORT,
  ENGINE_WIRE_COMBAT_INTENT_KINDS,
  GAME_INTENT_ACTION_SUPPORT,
  GAME_INTENT_TO_WIRE_KIND,
  NON_COMBAT_WIRE_INTENT_KINDS,
  P2P_INTENT_TRANSLATION_SUPPORT,
  WIRE_INTENT_KIND_ACTION_SUPPORT,
  sortedKeys,
  supportGaps,
  supportIdsByLevel,
} from './combatActionCatalog.test-helpers';

it('keeps game intent support mapped to authoritative server wire kinds', () => {
  const peer = 'player-peer';
  const confirmHeatIntent: IGameIntent = {
    type: 'confirmHeat',
    payload: {},
    authorPeerId: peer,
  };
  const mappedKinds = {
    declareMovement: toServerIntent(
      declareMovementIntent(peer, {
        unitId: 'player-1',
        to: { q: 1, r: -1 },
        facing: 2,
        movementType: 'walk',
      }),
    )?.kind,
    stand: toServerIntent(standIntent(peer, { unitId: 'player-1' }))?.kind,
    goProne: toServerIntent(goProneIntent(peer, { unitId: 'player-1' }))?.kind,
    activateMovementEnhancement: toServerIntent(
      activateMovementEnhancementIntent(peer, {
        unitId: 'player-1',
        enhancement: 'MASC',
      }),
    )?.kind,
    torsoTwist: toServerIntent(
      torsoTwistIntent(peer, {
        unitId: 'player-1',
        secondaryFacing: 5,
      }),
    )?.kind,
    declareAttack: toServerIntent(
      declareAttackIntent(peer, {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponIds: ['medium-laser'],
      }),
    )?.kind,
    declarePhysical: toServerIntent(
      declarePhysicalIntent(peer, {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        attackType: 'kick',
      }),
    )?.kind,
    requestSpot: toServerIntent(
      requestSpotIntent(peer, {
        unitId: 'player-1',
        targetId: 'opponent-1',
      }),
    )?.kind,
    confirmHeat: toServerIntent(confirmHeatIntent)?.kind,
    endPhase: toServerIntent(endPhaseIntent(peer))?.kind,
    eject: toServerIntent(ejectIntent(peer, { unitId: 'player-1' }))?.kind,
    withdraw: toServerIntent(
      withdrawIntent(peer, { unitId: 'player-1', edge: 'north' }),
    )?.kind,
    concede: toServerIntent(concedeIntent(peer, { side: GameSide.Player }))
      ?.kind,
  };

  expect(sortedKeys(GAME_INTENT_ACTION_SUPPORT)).toEqual(
    [...GAME_INTENT_TYPES].sort(),
  );
  expect(supportGaps(GAME_INTENT_ACTION_SUPPORT)).toEqual([]);
  expect(mappedKinds).toEqual(GAME_INTENT_TO_WIRE_KIND);
  expect(supportIdsByLevel(GAME_INTENT_ACTION_SUPPORT, 'integrated')).toEqual(
    [...GAME_INTENT_TYPES].sort(),
  );
  for (const intentType of GAME_INTENT_TYPES) {
    const entry = GAME_INTENT_ACTION_SUPPORT[intentType];
    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: expect.stringContaining('gameIntentMap.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
  }
  const megamekBackedGameIntentRows = {
    goProne: 'MoveStepType defines GO_PRONE',
    activateMovementEnhancement: 'MovePath derives active MASC/Supercharger',
    torsoTwist: 'TorsoTwistAction',
    requestSpot: 'SpotAction carries',
  } as const;
  for (const [intentType, citation] of Object.entries(
    megamekBackedGameIntentRows,
  )) {
    expect(
      GAME_INTENT_ACTION_SUPPORT[
        intentType as keyof typeof megamekBackedGameIntentRows
      ].sourceRefs?.map((sourceRef) => sourceRef.citation),
    ).toEqual(expect.arrayContaining([expect.stringContaining(citation)]));
  }
});

it('tracks direct UI action surfaces that bypass the generic command payload shape', () => {
  expect(sortedKeys(COMBAT_DIRECT_UI_ACTION_SUPPORT)).toEqual([
    'utility.withdraw-control',
  ]);
  expect(supportGaps(COMBAT_DIRECT_UI_ACTION_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(COMBAT_DIRECT_UI_ACTION_SUPPORT, 'integrated'),
  ).toEqual(['utility.withdraw-control']);
  expect(
    COMBAT_DIRECT_UI_ACTION_SUPPORT['utility.withdraw-control'].sourceRefs,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'mekstation-deviation',
        url: expect.stringContaining('WithdrawControl.tsx#L'),
        sourceVersion: 'MekStation working-tree',
      }),
    ]),
  );
  expect(
    COMBAT_DIRECT_UI_ACTION_SUPPORT[
      'utility.withdraw-control'
    ].sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
  ).toBe(true);
});

it('splits combat wire intents from lobby and reconnect intents', () => {
  expect(supportGaps(WIRE_INTENT_KIND_ACTION_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(WIRE_INTENT_KIND_ACTION_SUPPORT, 'integrated'),
  ).toEqual([...ENGINE_WIRE_COMBAT_INTENT_KINDS].sort());
  expect(
    supportIdsByLevel(WIRE_INTENT_KIND_ACTION_SUPPORT, 'out-of-scope'),
  ).toEqual([...NON_COMBAT_WIRE_INTENT_KINDS].sort());
  expect(
    supportIdsByLevel(WIRE_INTENT_KIND_ACTION_SUPPORT, 'unsupported'),
  ).toEqual([]);
  expect(
    ENGINE_WIRE_COMBAT_INTENT_KINDS.filter((kind) =>
      NON_COMBAT_WIRE_INTENT_KINDS.includes(kind as never),
    ),
  ).toEqual([]);
  for (const kind of [
    ...ENGINE_WIRE_COMBAT_INTENT_KINDS,
    ...NON_COMBAT_WIRE_INTENT_KINDS,
  ]) {
    const entry = WIRE_INTENT_KIND_ACTION_SUPPORT[kind];
    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: expect.stringContaining('ServerMatchHostEngineDispatch.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
  }
  for (const kind of NON_COMBAT_WIRE_INTENT_KINDS) {
    const entry = WIRE_INTENT_KIND_ACTION_SUPPORT[kind];
    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: expect.stringContaining('Protocol.ts#L'),
        }),
      ]),
    );
  }
  const megamekBackedWireIntentRows = {
    GoProne: 'MoveStepType defines GO_PRONE',
    ActivateMovementEnhancement: 'MovePath derives active MASC/Supercharger',
    TorsoTwist: 'TorsoTwistAction',
    RequestSpot: 'SpotAction carries',
  } as const;
  for (const [kind, citation] of Object.entries(megamekBackedWireIntentRows)) {
    expect(
      WIRE_INTENT_KIND_ACTION_SUPPORT[
        kind as keyof typeof megamekBackedWireIntentRows
      ].sourceRefs?.map((sourceRef) => sourceRef.citation),
    ).toEqual(expect.arrayContaining([expect.stringContaining(citation)]));
  }
});

it('keeps legacy P2P intent support aligned with game intent coverage', () => {
  expect(sortedKeys(P2P_INTENT_TRANSLATION_SUPPORT)).toEqual(
    [...GAME_INTENT_TYPES].sort(),
  );
  expect(supportGaps(P2P_INTENT_TRANSLATION_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(P2P_INTENT_TRANSLATION_SUPPORT, 'integrated'),
  ).toEqual([
    'activateMovementEnhancement',
    'concede',
    'confirmHeat',
    'declareAttack',
    'declareMovement',
    'declarePhysical',
    'eject',
    'endPhase',
    'goProne',
    'requestSpot',
    'stand',
    'torsoTwist',
    'withdraw',
  ]);
  expect(
    supportIdsByLevel(P2P_INTENT_TRANSLATION_SUPPORT, 'helper-only'),
  ).toEqual([]);
  const p2pCommandRows = [
    'activateMovementEnhancement',
    'concede',
    'goProne',
    'stand',
  ];
  for (const intentType of GAME_INTENT_TYPES) {
    const entry = P2P_INTENT_TRANSLATION_SUPPORT[intentType];
    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: expect.stringContaining('src/lib/p2p/intentTranslation'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
    if (p2pCommandRows.includes(intentType)) {
      expect(entry.sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: expect.stringContaining('hostIntentRouter.ts#L'),
          }),
        ]),
      );
    }
  }
});
