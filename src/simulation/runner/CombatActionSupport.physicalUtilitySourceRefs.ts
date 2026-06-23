import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

import { mekstationDeviationSourceRef } from './CombatActionSupport.entries';

export const MEKSTATION_WEAPON_DECLARE_ATTACK_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildWeaponAttackCommands exposes weapon.declare-attack as a target-selection command that commits the local declare-attack action id.',
    'src/components/gameplay/TacticalActionDock/commands/weaponAttackCommands.ts',
    'L24-L46',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_WEAPON_FIRE_VOLLEY_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildWeaponAttackCommands exposes weapon.fire-volley as the confirmed weapon attack commit command that commits the local lock volley action payload.',
    'src/components/gameplay/TacticalActionDock/commands/weaponAttackCommands.ts',
    'L50-L73',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_WEAPON_CLEAR_ATTACKS_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildWeaponAttackCommands exposes weapon.clear-attacks as a local draft attack reset command that commits the clear action id.',
    'src/components/gameplay/TacticalActionDock/commands/weaponAttackCommands.ts',
    'L76-L90',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

function mekstationPhysicalCommandSourceRefs(
  id: string,
  attackType: string,
  lineRange: string,
) {
  return [
    mekstationDeviationSourceRef(
      `MekStation buildPhysicalAttackCommands exposes ${id} as a confirmed PhysicalAttack command that commits physical-attack with ${attackType} attackType.`,
      'src/components/gameplay/TacticalActionDock/commands/physicalAttackCommands.ts',
      lineRange,
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];
}

export const MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS = {
  'physical.punch': mekstationPhysicalCommandSourceRefs(
    'physical.punch',
    'punch',
    'L45-L55',
  ),
  'physical.kick': mekstationPhysicalCommandSourceRefs(
    'physical.kick',
    'kick',
    'L59-L69',
  ),
  'physical.push': mekstationPhysicalCommandSourceRefs(
    'physical.push',
    'push',
    'L73-L83',
  ),
  'physical.trip': mekstationPhysicalCommandSourceRefs(
    'physical.trip',
    'trip',
    'L87-L99',
  ),
  'physical.thrash': mekstationPhysicalCommandSourceRefs(
    'physical.thrash',
    'thrash',
    'L101-L113',
  ),
  'physical.jump-jet-attack': mekstationPhysicalCommandSourceRefs(
    'physical.jump-jet-attack',
    'jump-jet-attack',
    'L117-L132',
  ),
  'physical.brush-off': mekstationPhysicalCommandSourceRefs(
    'physical.brush-off',
    'brush-off',
    'L134-L150',
  ),
  'physical.grapple': mekstationPhysicalCommandSourceRefs(
    'physical.grapple',
    'grapple',
    'L152-L164',
  ),
  'physical.break-grapple': mekstationPhysicalCommandSourceRefs(
    'physical.break-grapple',
    'break-grapple',
    'L166-L180',
  ),
  'physical.charge': mekstationPhysicalCommandSourceRefs(
    'physical.charge',
    'charge',
    'L115-L125',
  ),
  'physical.dfa': mekstationPhysicalCommandSourceRefs(
    'physical.dfa',
    'dfa',
    'L127-L144',
  ),
  'physical.club': mekstationPhysicalCommandSourceRefs(
    'physical.club',
    'hatchet',
    'L122-L138',
  ),
  'physical.sword': mekstationPhysicalCommandSourceRefs(
    'physical.sword',
    'sword',
    'L142-L152',
  ),
  'physical.mace': mekstationPhysicalCommandSourceRefs(
    'physical.mace',
    'mace',
    'L156-L166',
  ),
  'physical.lance': mekstationPhysicalCommandSourceRefs(
    'physical.lance',
    'lance',
    'L170-L180',
  ),
  'physical.retractable-blade': mekstationPhysicalCommandSourceRefs(
    'physical.retractable-blade',
    'retractable-blade',
    'L184-L197',
  ),
  'physical.flail': mekstationPhysicalCommandSourceRefs(
    'physical.flail',
    'flail',
    'L201-L211',
  ),
  'physical.wrecking-ball': mekstationPhysicalCommandSourceRefs(
    'physical.wrecking-ball',
    'wrecking-ball',
    'L215-L227',
  ),
} satisfies Record<string, readonly ICombatFeatureSourceReference[]>;

export const MEKSTATION_WITHDRAW_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildUtilityCommands exposes utility.withdraw as a product-visible command that commits the local withdraw action id without an edge-selection payload.',
    'src/components/gameplay/TacticalActionDock/commands/utilityCommands.ts',
    'L50-L64',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EJECT_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildUtilityCommands exposes utility.eject as a confirmed product-visible command that commits the local eject action id.',
    'src/components/gameplay/TacticalActionDock/commands/utilityCommands.ts',
    'L32-L47',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_CONCEDE_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildUtilityCommands exposes utility.concede as a confirmed product-visible command that commits the local concede action id without requiring an active unit.',
    'src/components/gameplay/TacticalActionDock/commands/utilityCommands.ts',
    'L68-L82',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAT_CONTINUE_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildHeatEndCommands exposes heat.continue as the Heat-phase continue command that commits the local continue action id.',
    'src/components/gameplay/TacticalActionDock/commands/heatEndCommands.ts',
    'L22-L36',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_END_PHASE_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildHeatEndCommands exposes heat-end.end-phase as the confirmed phase-advance command for movement, weapon, and physical phases.',
    'src/components/gameplay/TacticalActionDock/commands/heatEndCommands.ts',
    'L39-L60',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_NEXT_TURN_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildHeatEndCommands exposes heat-end.next-turn as the End-phase next-turn command that commits the local next-turn action id.',
    'src/components/gameplay/TacticalActionDock/commands/heatEndCommands.ts',
    'L63-L77',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_WITHDRAW_CONTROL_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation WithdrawControl exposes the direct UI contract for declaring withdrawal with a selected map edge.',
    'src/components/gameplay/WithdrawControl.tsx',
    'L34-L52',
  ),
  mekstationDeviationSourceRef(
    'MekStation WithdrawControl calls onDeclareWithdrawal with unitId and selectedEdge when the player commits the direct UI withdrawal action.',
    'src/components/gameplay/WithdrawControl.tsx',
    'L75-L78',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_REQUEST_SPOT_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildUtilityCommands exposes utility.request-spot as a target-aware local spotting command that commits the request-spot action id with active-unit and target-unit payload fields.',
    'src/components/gameplay/TacticalActionDock/commands/utilityCommands.ts',
    'L85-L111',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

function mekstationGmCommandSourceRefs(id: string, lineRange: string) {
  return [
    mekstationDeviationSourceRef(
      `MekStation buildGmReferralCommands exposes ${id} as a GM shell-mode command that commits a gm-intervention.preview intent outside player BattleMech combat action handling.`,
      'src/components/gameplay/TacticalActionDock/commands/gmReferralCommands.ts',
      lineRange,
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];
}

export const MEKSTATION_GM_COMMAND_SOURCE_REFS = {
  'gm.advance-phase': mekstationGmCommandSourceRefs(
    'gm.advance-phase',
    'L37-L46',
  ),
  'gm.set-position-facing': mekstationGmCommandSourceRefs(
    'gm.set-position-facing',
    'L48-L57',
  ),
  'gm.set-damage': mekstationGmCommandSourceRefs('gm.set-damage', 'L59-L68'),
  'gm.set-heat-ammo': mekstationGmCommandSourceRefs(
    'gm.set-heat-ammo',
    'L70-L79',
  ),
  'gm.set-initiative': mekstationGmCommandSourceRefs(
    'gm.set-initiative',
    'L81-L90',
  ),
  'gm.set-lifecycle': mekstationGmCommandSourceRefs(
    'gm.set-lifecycle',
    'L92-L101',
  ),
  'gm.correct-attack': mekstationGmCommandSourceRefs(
    'gm.correct-attack',
    'L103-L112',
  ),
  'gm.set-objective': mekstationGmCommandSourceRefs(
    'gm.set-objective',
    'L114-L123',
  ),
  'gm.reload-unit': mekstationGmCommandSourceRefs(
    'gm.reload-unit',
    'L125-L134',
  ),
  'gm.grant-resource': mekstationGmCommandSourceRefs(
    'gm.grant-resource',
    'L136-L145',
  ),
} satisfies Record<string, readonly ICombatFeatureSourceReference[]>;
