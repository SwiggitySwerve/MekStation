import { buildFacingCommands } from '@/components/gameplay/TacticalActionDock/commands/facingCommands';
import { buildGmReferralCommands } from '@/components/gameplay/TacticalActionDock/commands/gmReferralCommands';
import { buildHeatEndCommands } from '@/components/gameplay/TacticalActionDock/commands/heatEndCommands';
import { buildMovementCommands } from '@/components/gameplay/TacticalActionDock/commands/movementCommands';
import { buildPhysicalAttackCommands } from '@/components/gameplay/TacticalActionDock/commands/physicalAttackCommands';
import { buildUtilityCommands } from '@/components/gameplay/TacticalActionDock/commands/utilityCommands';
import { buildWeaponAttackCommands } from '@/components/gameplay/TacticalActionDock/commands/weaponAttackCommands';
import {
  activateMovementEnhancementIntent,
  concedeIntent,
  declareAttackIntent,
  declareMovementIntent,
  declarePhysicalIntent,
  ejectIntent,
  endPhaseIntent,
  goProneIntent,
  standIntent,
  toServerIntent,
  torsoTwistIntent,
  withdrawIntent,
} from '@/lib/multiplayer/gameIntentMap';
import {
  GameSide,
  GAME_INTENT_TYPES,
  MovementType,
  type IGameIntent,
  type ITacticalCommand,
} from '@/types/gameplay';
import { SUPPORTED_PHYSICAL_ATTACK_TYPES } from '@/utils/gameplay/physicalAttacks/types';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
  BATTLEMECH_ABSENT_ACTION_SUPPORT,
  COMBAT_COMMAND_ACTION_SUPPORT,
  COMBAT_DIRECT_UI_ACTION_SUPPORT,
  ENGINE_WIRE_COMBAT_INTENT_KINDS,
  GAME_INTENT_ACTION_SUPPORT,
  GAME_INTENT_TO_WIRE_KIND,
  GM_COMMAND_EXCLUSION_SUPPORT,
  NON_COMBAT_WIRE_INTENT_KINDS,
  P2P_INTENT_TRANSLATION_SUPPORT,
  WIRE_INTENT_KIND_ACTION_SUPPORT,
} from '../CombatActionSupport';
import {
  MEGAMEK_CONCRETE_PHYSICAL_ACTION_CLASSES,
  PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT,
} from '../CombatPhysicalActionClassScopeSupport';
import { PHYSICAL_ATTACK_ACTION_SUPPORT } from '../CombatPhysicalActionSupport';
import { PHYSICAL_LEGALITY_GATE_SUPPORT } from '../CombatPhysicalLegalityGateSupport';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function commandIds(commands: readonly ITacticalCommand[]): readonly string[] {
  return commands.map((command) => command.id).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

describe('BattleMech combat action support catalog', () => {
  it('covers every player tactical command and excludes GM referee tools', () => {
    const playerCommandIds = commandIds([
      ...buildMovementCommands(),
      ...buildFacingCommands(),
      ...buildWeaponAttackCommands(),
      ...buildPhysicalAttackCommands(),
      ...buildHeatEndCommands(),
      ...buildUtilityCommands(),
    ]);
    const gmCommandIds = commandIds(buildGmReferralCommands());

    expect(sortedKeys(COMBAT_COMMAND_ACTION_SUPPORT)).toEqual(playerCommandIds);
    expect(sortedKeys(GM_COMMAND_EXCLUSION_SUPPORT)).toEqual(gmCommandIds);
    expect(playerCommandIds.filter((id) => id.startsWith('gm.'))).toEqual([]);
    expect(supportGaps(COMBAT_COMMAND_ACTION_SUPPORT)).toEqual([]);
    expect(supportGaps(GM_COMMAND_EXCLUSION_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(GM_COMMAND_EXCLUSION_SUPPORT, 'out-of-scope'),
    ).toEqual(['gm.advance-phase', 'gm.grant-resource', 'gm.set-damage']);
    expect(
      supportIdsByLevel(GM_COMMAND_EXCLUSION_SUPPORT, 'unsupported'),
    ).toEqual([]);
    for (const id of [
      'gm.advance-phase',
      'gm.set-damage',
      'gm.grant-resource',
    ] as const) {
      expect(GM_COMMAND_EXCLUSION_SUPPORT[id].sourceRefs).toEqual([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining('gmReferralCommands.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]);
    }

    expect(
      supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'integrated'),
    ).toEqual([
      'facing.rotate-left',
      'facing.rotate-right',
      'facing.torso-twist',
      'heat-end.end-phase',
      'heat-end.next-turn',
      'heat.continue',
      'movement.activate-masc',
      'movement.activate-supercharger',
      'movement.evade',
      'movement.go-prone',
      'movement.jump',
      'movement.run',
      'movement.stand',
      'movement.walk',
      'physical.charge',
      'physical.club',
      'physical.dfa',
      'physical.flail',
      'physical.kick',
      'physical.lance',
      'physical.mace',
      'physical.punch',
      'physical.push',
      'physical.retractable-blade',
      'physical.sword',
      'physical.wrecking-ball',
      'utility.concede',
      'utility.eject',
      'weapon.fire-volley',
    ]);
    expect(
      supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'helper-only'),
    ).toEqual(['utility.request-spot']);
    const helperCommandSourceFiles = {
      'utility.request-spot': 'utilityCommands.ts',
    } as const;
    const outOfScopeCommandSourceFiles = {
      'movement.cancel': 'movementCommands.ts',
      'movement.stabilize': 'movementCommands.ts',
      'utility.withdraw': 'utilityCommands.ts',
      'weapon.clear-attacks': 'weaponAttackCommands.ts',
      'weapon.declare-attack': 'weaponAttackCommands.ts',
    } as const;
    for (const [id, file] of Object.entries(helperCommandSourceFiles)) {
      const entry =
        COMBAT_COMMAND_ACTION_SUPPORT[
          id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
        ];

      expect(entry.sourceRefs).toEqual([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining(file),
          sourceVersion: 'MekStation working-tree',
        }),
      ]);
    }
    for (const [id, file] of Object.entries(outOfScopeCommandSourceFiles)) {
      const entry =
        COMBAT_COMMAND_ACTION_SUPPORT[
          id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
        ];

      expect(entry).toMatchObject({ level: 'out-of-scope' });
      expect(entry.sourceRefs).toEqual([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining(file),
          sourceVersion: 'MekStation working-tree',
        }),
      ]);
    }
    const integratedMovementCommandSourceRows = [
      'movement.activate-masc',
      'movement.activate-supercharger',
      'movement.evade',
      'movement.go-prone',
      'movement.jump',
      'movement.run',
      'movement.stand',
      'movement.walk',
    ];
    for (const id of integratedMovementCommandSourceRows) {
      const entry =
        COMBAT_COMMAND_ACTION_SUPPORT[
          id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
        ];

      expect(entry.sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            citation: expect.stringContaining(id),
            url: expect.stringContaining('movementCommands.ts#L'),
            sourceVersion: 'MekStation working-tree',
          }),
        ]),
      );
      expect(
        entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
      ).toBe(true);
    }
    const utilityCommandSourceRows = [
      'utility.concede',
      'utility.eject',
      'utility.request-spot',
      'utility.withdraw',
    ];
    for (const id of utilityCommandSourceRows) {
      const entry =
        COMBAT_COMMAND_ACTION_SUPPORT[
          id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
        ];

      expect(entry.sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            citation: expect.stringContaining(id),
            url: expect.stringContaining('utilityCommands.ts#L'),
            sourceVersion: 'MekStation working-tree',
          }),
        ]),
      );
      expect(
        entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
      ).toBe(true);
    }
    expect(
      COMBAT_COMMAND_ACTION_SUPPORT['weapon.fire-volley'].sourceRefs,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('weapon.fire-volley'),
          url: expect.stringContaining('weaponAttackCommands.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      COMBAT_COMMAND_ACTION_SUPPORT['weapon.fire-volley'].sourceRefs?.every(
        (sourceRef) => sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
    const heatEndCommandSourceRows = [
      'heat.continue',
      'heat-end.end-phase',
      'heat-end.next-turn',
    ];
    for (const id of heatEndCommandSourceRows) {
      const entry =
        COMBAT_COMMAND_ACTION_SUPPORT[
          id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
        ];

      expect(entry.sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            citation: expect.stringContaining(id),
            url: expect.stringContaining('heatEndCommands.ts#L'),
            sourceVersion: 'MekStation working-tree',
          }),
        ]),
      );
      expect(
        entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
      ).toBe(true);
    }
    const facingCommandSourceRows = [
      'facing.rotate-left',
      'facing.rotate-right',
      'facing.torso-twist',
    ];
    for (const id of facingCommandSourceRows) {
      const entry =
        COMBAT_COMMAND_ACTION_SUPPORT[
          id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
        ];

      expect(entry.sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            citation: expect.stringContaining(id),
            url: expect.stringContaining('facingCommands.ts#L'),
            sourceVersion: 'MekStation working-tree',
          }),
        ]),
      );
      expect(
        entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
      ).toBe(true);
    }
    const physicalCommandSourceRows = [
      'physical.charge',
      'physical.club',
      'physical.dfa',
      'physical.flail',
      'physical.kick',
      'physical.lance',
      'physical.mace',
      'physical.punch',
      'physical.push',
      'physical.retractable-blade',
      'physical.sword',
      'physical.wrecking-ball',
    ];
    for (const id of physicalCommandSourceRows) {
      const entry =
        COMBAT_COMMAND_ACTION_SUPPORT[
          id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
        ];

      expect(entry.sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            citation: expect.stringContaining(id),
            url: expect.stringContaining('physicalAttackCommands.ts#L'),
            sourceVersion: 'MekStation working-tree',
          }),
        ]),
      );
      expect(
        entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
      ).toBe(true);
    }
    expect(
      supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'unsupported'),
    ).toEqual([]);
    expect(COMBAT_COMMAND_ACTION_SUPPORT['movement.stabilize']).toMatchObject({
      level: 'out-of-scope',
      layer: 'tactical-command',
      gap: expect.stringContaining('MekStation-local command id'),
      sourceRefs: [
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('movement.stabilize'),
        }),
      ],
    });
    expect(
      COMBAT_COMMAND_ACTION_SUPPORT['facing.torso-twist'].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TorsoTwistAction'),
        expect.stringContaining('secondary facing'),
        expect.stringContaining('canChangeSecondaryFacing'),
        expect.stringContaining('ComputeArc'),
      ]),
    );
    expect(
      COMBAT_COMMAND_ACTION_SUPPORT['facing.torso-twist'].gap,
    ).toBeUndefined();
  });

  it('tracks official BattleMech action surfaces that have no authoritative command or wire path', () => {
    const playerCommandIds = commandIds([
      ...buildMovementCommands(),
      ...buildFacingCommands(),
      ...buildWeaponAttackCommands(),
      ...buildPhysicalAttackCommands(),
      ...buildHeatEndCommands(),
      ...buildUtilityCommands(),
    ]);

    expect(sortedKeys(BATTLEMECH_ABSENT_ACTION_SUPPORT)).toEqual([
      'movement.sprint',
    ]);
    expect(supportGaps(BATTLEMECH_ABSENT_ACTION_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(BATTLEMECH_ABSENT_ACTION_SUPPORT, 'unsupported'),
    ).toEqual(['movement.sprint']);
    expect(
      sortedKeys(BATTLEMECH_ABSENT_ACTION_SUPPORT).filter((id) =>
        playerCommandIds.includes(id),
      ),
    ).toEqual([]);
    expect(Object.values(MovementType)).toContain('evade');
    expect(Object.values(MovementType)).not.toContain('sprint');
    expect(COMBAT_COMMAND_ACTION_SUPPORT['movement.evade']).toMatchObject({
      layer: 'tactical-command',
      level: 'integrated',
      evidence: expect.stringContaining('MovementType.Evade'),
    });
    expect(COMBAT_COMMAND_ACTION_SUPPORT['movement.evade'].gap).toBeUndefined();
    expect(
      COMBAT_COMMAND_ACTION_SUPPORT['movement.evade'].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('movement.evade'),
        expect.stringContaining('TacOps Evade'),
        expect.stringContaining('MoveStepType defines EVADE'),
        expect.stringContaining('sets the entity evading flag'),
        expect.stringContaining('Engine.getRunHeat'),
        expect.stringContaining('getEvasionBonus'),
        expect.stringContaining('target evasion bonus'),
        expect.stringContaining('evading attackers from firing'),
      ]),
    );
    expect(BATTLEMECH_ABSENT_ACTION_SUPPORT['movement.sprint']).toMatchObject({
      layer: 'absent-action-surface',
      gap: expect.stringContaining('no authoritative sprint action path'),
    });
    expect(BATTLEMECH_ABSENT_ACTION_SUPPORT['movement.sprint'].gap).toContain(
      'feeds runner heat as normal-engine sprint heat',
    );
    expect(
      BATTLEMECH_ABSENT_ACTION_SUPPORT['movement.sprint'].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('MoveStep.canUseSprint'),
        expect.stringContaining('Mek.getSprintMP'),
        expect.stringContaining('Mek.getSprintHeat'),
        expect.stringContaining('Engine.getSprintHeat'),
        expect.stringContaining('attacks by sprinting attackers'),
        expect.stringContaining('target sprinted'),
      ]),
    );
  });

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
      goProne: toServerIntent(goProneIntent(peer, { unitId: 'player-1' }))
        ?.kind,
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
    } as const;
    for (const [kind, citation] of Object.entries(
      megamekBackedWireIntentRows,
    )) {
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
            url: expect.stringContaining('intentTranslation.ts#L'),
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

  it('tracks supported physical attack types that have no tactical command', () => {
    const physicalCommandAttackTypes = Object.fromEntries(
      buildPhysicalAttackCommands().map((command) => [
        command.id,
        command.commit({} as never).payload?.attackType,
      ]),
    );

    expect(sortedKeys(PHYSICAL_ATTACK_ACTION_SUPPORT)).toEqual(
      [...SUPPORTED_PHYSICAL_ATTACK_TYPES].sort(),
    );
    expect(supportGaps(PHYSICAL_ATTACK_ACTION_SUPPORT)).toEqual([]);
    expect(physicalCommandAttackTypes).toMatchObject({
      'physical.charge': 'charge',
      'physical.club': 'hatchet',
      'physical.dfa': 'dfa',
      'physical.flail': 'flail',
      'physical.kick': 'kick',
      'physical.lance': 'lance',
      'physical.mace': 'mace',
      'physical.punch': 'punch',
      'physical.push': 'push',
      'physical.retractable-blade': 'retractable-blade',
      'physical.sword': 'sword',
      'physical.wrecking-ball': 'wrecking-ball',
    });
    expect(
      supportIdsByLevel(PHYSICAL_ATTACK_ACTION_SUPPORT, 'integrated'),
    ).toEqual([
      'charge',
      'dfa',
      'flail',
      'hatchet',
      'kick',
      'lance',
      'mace',
      'punch',
      'push',
      'retractable-blade',
      'sword',
      'wrecking-ball',
    ]);
    expect(
      supportIdsByLevel(PHYSICAL_ATTACK_ACTION_SUPPORT, 'helper-only'),
    ).toEqual([]);
    for (const entry of Object.values(PHYSICAL_ATTACK_ACTION_SUPPORT)) {
      expect(entry.sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: expect.stringContaining('physicalAttackCommands.ts#L'),
          }),
        ]),
      );
    }
  });

  it('partitions every source-checked MegaMek physical action class into BattleMech support or explicit scope gaps', () => {
    expect(
      Object.values(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT)
        .map((entry) => entry.sourceClass)
        .sort(),
    ).toEqual([...MEGAMEK_CONCRETE_PHYSICAL_ACTION_CLASSES].sort());
    expect(supportGaps(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT)).toEqual([]);

    expect(
      supportIdsByLevel(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT, 'integrated'),
    ).toEqual(['charge', 'club', 'dfa', 'kick', 'punch', 'push']);
    expect(
      supportIdsByLevel(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT, 'unsupported'),
    ).toEqual([
      'break-grapple',
      'brush-off',
      'grapple',
      'jump-jet-attack',
      'thrash',
      'trip',
    ]);
    expect(
      supportIdsByLevel(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT, 'out-of-scope'),
    ).toEqual([
      'airmek-ram',
      'battle-armor-vibro-claw',
      'lay-explosives',
      'protomek-physical',
      'ram',
    ]);

    const battleMechGaps = Object.values(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT)
      .filter(
        (entry) =>
          entry.battleMechScope === 'battlemech' &&
          entry.level === 'unsupported',
      )
      .map((entry) => entry.id)
      .sort();
    expect(battleMechGaps).toEqual([
      'break-grapple',
      'brush-off',
      'grapple',
      'jump-jet-attack',
      'thrash',
      'trip',
    ]);

    const invalidPhysicalClassRefs = Object.values(
      PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT,
    ).flatMap((entry) => {
      const sourceRefs = entry.sourceRefs ?? [];
      if (sourceRefs.length === 0) return [`${entry.id}: missing sourceRefs`];

      return sourceRefs.flatMap((sourceRef, index) => {
        const sourceRefId = `${entry.id}.sourceRefs[${index}]`;
        const failures: string[] = [];

        if (sourceRef.kind !== 'megamek-source') {
          failures.push(`${sourceRefId}: expected megamek-source`);
        }
        if (
          sourceRef.sourceVersion !== '325b2504c7b7750ecdcb85468621fb2de2ad8e60'
        ) {
          failures.push(`${sourceRefId}: expected commit-pinned version`);
        }
        if (!sourceRef.url.includes(entry.sourceClass)) {
          failures.push(`${sourceRefId}: expected source class URL`);
        }
        if (!sourceRef.url.includes('#L')) {
          failures.push(`${sourceRefId}: missing line anchor`);
        }

        return failures;
      });
    });
    expect(invalidPhysicalClassRefs).toEqual([]);
    expect(
      PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['brush-off'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([expect.stringContaining('BrushOffAttackAction')]);
    expect(
      PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.thrash.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([expect.stringContaining('ThrashAttackAction')]);
    expect(
      PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.trip.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([expect.stringContaining('TripAttackAction')]);
    expect(
      PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.grapple.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([expect.stringContaining('GrappleAttackAction')]);
    expect(
      PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['break-grapple'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([expect.stringContaining('BreakGrappleAttackAction')]);
    expect(
      PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['jump-jet-attack'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([expect.stringContaining('JumpJetAttackAction')]);
  });

  it('anchors every physical legality gate to commit-pinned MegaMek source', () => {
    const invalidSourceRefs = Object.values(
      PHYSICAL_LEGALITY_GATE_SUPPORT,
    ).flatMap((entry) => {
      const sourceRefs = entry.sourceRefs ?? [];
      if (sourceRefs.length === 0) return [`${entry.id}: missing sourceRefs`];

      return sourceRefs.flatMap((sourceRef, index) => {
        const sourceRefId = `${entry.id}.sourceRefs[${index}]`;
        const failures: string[] = [];

        if (sourceRef.kind !== 'megamek-source') {
          failures.push(`${sourceRefId}: expected megamek-source`);
        }
        if (!sourceRef.url.includes('github.com/MegaMek/megamek/blob/')) {
          failures.push(`${sourceRefId}: missing MegaMek blob URL`);
        }
        if (!sourceRef.url.includes(sourceRef.sourceVersion)) {
          failures.push(`${sourceRefId}: source version not pinned in URL`);
        }
        if (!sourceRef.url.includes('#L')) {
          failures.push(`${sourceRefId}: missing line anchor`);
        }
        if (sourceRef.citation.trim().length === 0) {
          failures.push(`${sourceRefId}: missing citation`);
        }

        return failures;
      });
    });

    expect(invalidSourceRefs).toEqual([]);
    expect(
      Object.values(PHYSICAL_LEGALITY_GATE_SUPPORT)
        .filter((entry) => entry.level !== 'integrated')
        .map((entry) => entry.gap)
        .every((gap) => typeof gap === 'string' && gap.length > 0),
    ).toBe(true);
  });

  it('catalogs punch and kick missing-limb legality as integrated source-backed gates', () => {
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['punch.selected-arm-present'],
    ).toMatchObject({
      level: 'integrated',
      attackFamily: 'punch',
      evidence: expect.stringContaining('attackerDestroyedLocations'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('PunchAttackAction'),
        }),
      ],
    });
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['kick.both-legs-present'],
    ).toMatchObject({
      level: 'integrated',
      attackFamily: 'kick',
      evidence: expect.stringContaining('left or right BattleMech legs'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('KickAttackAction'),
        }),
      ],
    });
  });

  it('catalogs charge prone-attacker legality as an integrated source-backed gate', () => {
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['charge.attacker-not-prone'],
    ).toMatchObject({
      level: 'integrated',
      attackFamily: 'charge',
      evidence: expect.stringContaining('attackerProne'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('ChargeAttackAction'),
        }),
      ],
    });
  });

  it('catalogs charge backward-movement legality as an integrated source-backed gate', () => {
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['charge.no-backward-movement'],
    ).toMatchObject({
      level: 'integrated',
      attackFamily: 'charge',
      evidence: expect.stringContaining('movedBackwardThisTurn'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('move backward'),
        }),
      ],
    });
  });

  it('catalogs charge jump-movement legality as an integrated source-backed gate', () => {
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['charge.no-jump-movement'],
    ).toMatchObject({
      level: 'integrated',
      attackFamily: 'charge',
      evidence: expect.stringContaining('attackerJumpedThisTurn'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('that jump'),
        }),
      ],
    });
  });

  it('catalogs DFA mechanical jump booster legality as an integrated source-backed gate', () => {
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['dfa.no-mechanical-jump-booster'],
    ).toMatchObject({
      level: 'integrated',
      attackFamily: 'dfa',
      evidence: expect.stringContaining('usedMechanicalJumpBoosterThisTurn'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('DfaAttackAction'),
        }),
      ],
    });
  });

  it('catalogs DFA DropShip target legality as an integrated source-backed gate', () => {
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['dfa.target-not-dropship'],
    ).toMatchObject({
      level: 'integrated',
      attackFamily: 'dfa',
      evidence: expect.stringContaining('targetUnitType'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('DfaAttackAction'),
        }),
      ],
    });
  });

  it('catalogs DFA VTOL/WIGE reach with runner jump-MP and motion-type hydration', () => {
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['dfa.vtol-elevation-reachable'],
    ).toMatchObject({
      level: 'integrated',
      attackFamily: 'dfa',
      evidence: expect.stringContaining('automatic runner selection'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('DfaAttackAction'),
        }),
      ],
    });
  });

  it('keeps physical displacement chain edges visible and source-backed', () => {
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-chain'],
    ).toMatchObject({
      level: 'helper-only',
      gap: expect.stringContaining('Voluntary step-out/CFR'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining(
            'Compute.isValidDisplacement recursively validates',
          ),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('domino-effect displacement'),
        }),
      ],
    });
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-chain']
        .evidence,
    ).toContain('positional domino payload chains');
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-chain']
        .evidence,
    ).toContain('DominoEffect PSRs');
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-friendly-avoidance'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('DFA-miss displacement destinations'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining(
            'getPreferredDisplacement first skips',
          ),
        }),
      ],
    });
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-dropship-radius'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'runner and event-sourced DFA hit displacement',
      ),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining(
            'getValidDisplacement searches at radius two',
          ),
        }),
      ],
    });
  });
});
