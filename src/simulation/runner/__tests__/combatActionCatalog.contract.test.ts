import { buildFacingCommands } from '@/components/gameplay/TacticalActionDock/commands/facingCommands';
import { buildGmReferralCommands } from '@/components/gameplay/TacticalActionDock/commands/gmReferralCommands';
import { buildHeatEndCommands } from '@/components/gameplay/TacticalActionDock/commands/heatEndCommands';
import { buildMovementCommands } from '@/components/gameplay/TacticalActionDock/commands/movementCommands';
import { buildPhysicalAttackCommands } from '@/components/gameplay/TacticalActionDock/commands/physicalAttackCommands';
import { buildUtilityCommands } from '@/components/gameplay/TacticalActionDock/commands/utilityCommands';
import { buildWeaponAttackCommands } from '@/components/gameplay/TacticalActionDock/commands/weaponAttackCommands';
import {
  concedeIntent,
  declareAttackIntent,
  declareMovementIntent,
  declarePhysicalIntent,
  ejectIntent,
  endPhaseIntent,
  standIntent,
  toServerIntent,
  withdrawIntent,
} from '@/lib/multiplayer/gameIntentMap';
import {
  GameSide,
  GAME_INTENT_TYPES,
  type IGameIntent,
  type ITacticalCommand,
} from '@/types/gameplay';
import { SUPPORTED_PHYSICAL_ATTACK_TYPES } from '@/utils/gameplay/physicalAttacks/types';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
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
      supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'integrated'),
    ).toEqual([
      'facing.rotate-left',
      'facing.rotate-right',
      'heat-end.end-phase',
      'heat-end.next-turn',
      'heat.continue',
      'movement.jump',
      'movement.run',
      'movement.stand',
      'movement.walk',
      'physical.charge',
      'physical.club',
      'physical.dfa',
      'physical.kick',
      'physical.lance',
      'physical.mace',
      'physical.punch',
      'physical.push',
      'physical.sword',
      'utility.concede',
      'utility.eject',
      'weapon.fire-volley',
    ]);
    expect(
      supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'helper-only'),
    ).toEqual([
      'facing.torso-twist',
      'movement.cancel',
      'utility.request-spot',
      'utility.withdraw',
      'weapon.clear-attacks',
      'weapon.declare-attack',
    ]);
    expect(
      supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'unsupported'),
    ).toEqual(['movement.stabilize']);
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
  });

  it('tracks direct UI action surfaces that bypass the generic command payload shape', () => {
    expect(sortedKeys(COMBAT_DIRECT_UI_ACTION_SUPPORT)).toEqual([
      'utility.withdraw-control',
    ]);
    expect(supportGaps(COMBAT_DIRECT_UI_ACTION_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(COMBAT_DIRECT_UI_ACTION_SUPPORT, 'integrated'),
    ).toEqual(['utility.withdraw-control']);
  });

  it('splits combat wire intents from lobby and reconnect intents', () => {
    expect(supportGaps(WIRE_INTENT_KIND_ACTION_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(WIRE_INTENT_KIND_ACTION_SUPPORT, 'integrated'),
    ).toEqual([...ENGINE_WIRE_COMBAT_INTENT_KINDS].sort());
    expect(
      supportIdsByLevel(WIRE_INTENT_KIND_ACTION_SUPPORT, 'unsupported'),
    ).toEqual([...NON_COMBAT_WIRE_INTENT_KINDS].sort());
    expect(
      ENGINE_WIRE_COMBAT_INTENT_KINDS.filter((kind) =>
        NON_COMBAT_WIRE_INTENT_KINDS.includes(kind as never),
      ),
    ).toEqual([]);
  });

  it('keeps legacy P2P intent support aligned with game intent coverage', () => {
    expect(sortedKeys(P2P_INTENT_TRANSLATION_SUPPORT)).toEqual(
      [...GAME_INTENT_TYPES].sort(),
    );
    expect(supportGaps(P2P_INTENT_TRANSLATION_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(P2P_INTENT_TRANSLATION_SUPPORT, 'integrated'),
    ).toEqual([
      'concede',
      'confirmHeat',
      'declareAttack',
      'declareMovement',
      'declarePhysical',
      'eject',
      'endPhase',
      'stand',
      'withdraw',
    ]);
    expect(
      supportIdsByLevel(P2P_INTENT_TRANSLATION_SUPPORT, 'helper-only'),
    ).toEqual([]);
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
      'physical.kick': 'kick',
      'physical.lance': 'lance',
      'physical.mace': 'mace',
      'physical.punch': 'punch',
      'physical.push': 'push',
      'physical.sword': 'sword',
    });
    expect(
      supportIdsByLevel(PHYSICAL_ATTACK_ACTION_SUPPORT, 'integrated'),
    ).toEqual([
      'charge',
      'dfa',
      'hatchet',
      'kick',
      'lance',
      'mace',
      'punch',
      'push',
      'sword',
    ]);
    expect(
      supportIdsByLevel(PHYSICAL_ATTACK_ACTION_SUPPORT, 'helper-only'),
    ).toEqual([]);
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
      supportIdsByLevel(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT, 'helper-only'),
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
  });
});
