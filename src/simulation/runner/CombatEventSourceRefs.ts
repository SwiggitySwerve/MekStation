import {
  mekstationDeviationSourceRefWithLineAnchor as mekstationDeviationSourceRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

export const VEHICLE_EVENT_SCOPE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation vehicle event factories create motive-damage, motive-penalty, immobilization, turret-lock, crew-stun, and VTOL crash-check payloads.',
    'src/utils/gameplay/gameEvents/vehicle.ts',
    'L1-L340',
  ),
  mekstationDeviationSourceRef(
    'MekStation vehicle event tests assert the non-BattleMech vehicle event payload shapes.',
    'src/utils/gameplay/__tests__/vehicleEvents.test.ts',
    'L18-L110',
  ),
  mekstationDeviationSourceRef(
    'MekStation status event payload types keep vehicle event payloads separate from BattleMech event claims.',
    'src/types/gameplay/GameSessionStatusEvents.ts',
    'L324-L393',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLE_ARMOR_CASUALTY_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battle armor event factories create trooper-casualty and squad-elimination event payloads.',
    'src/utils/gameplay/gameEvents/battleArmorCasualty.ts',
    'L17-L97',
  ),
  mekstationDeviationSourceRef(
    'MekStation GameEventType comments classify trooper and squad casualty events as battle-armor combat events.',
    'src/types/gameplay/GameSessionCoreTypes.ts',
    'L220-L231',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLE_ARMOR_SWARM_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battle armor event factories create swarm attachment, damage, and dismount payloads.',
    'src/utils/gameplay/gameEvents/battleArmorSwarm.ts',
    'L17-L177',
  ),
  mekstationDeviationSourceRef(
    'MekStation battle armor swarm helpers keep attach, per-turn damage, and dismount behavior outside the BattleMech matrix.',
    'src/utils/gameplay/battlearmor/swarm.ts',
    'L1-L175',
  ),
  mekstationDeviationSourceRef(
    'MekStation InteractiveSession swarm-fire scenarios prove SwarmDamage emission for attached battle armor while remaining outside the BattleMech event matrix.',
    'src/engine/__tests__/InteractiveSession.swarmFire.scenario.test.ts',
    'L167-L224',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLE_ARMOR_LEG_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battle armor event factories create legacy LegAttack and migrated LegAttackResolved payloads.',
    'src/utils/gameplay/gameEvents/battleArmorLeg.ts',
    'L16-L168',
  ),
  mekstationDeviationSourceRef(
    'MekStation battle armor leg-attack resolvers keep Mek and vehicle leg-attack outcomes in the battle-armor validation lane.',
    'src/utils/gameplay/battlearmor/legAttackResolver.ts',
    'L250-L335',
  ),
  mekstationDeviationSourceRef(
    'MekStation InteractiveSession leg-attack action stamps LegAttackResolved events from pre-resolved battle-armor outcomes.',
    'src/engine/InteractiveSession.actions.ts',
    'L326-L397',
  ),
  mekstationDeviationSourceRef(
    'MekStation InteractiveSession leg-attack scenarios assert LegAttackResolved event payloads against Mek and vehicle targets.',
    'src/engine/__tests__/InteractiveSession.legAttack.scenario.test.ts',
    'L175-L205',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLE_ARMOR_VIBRO_CLAW_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation vibro-claw dispatch resolves cluster-model attacks and emits VibroClawAttackResolved plus standard DamageApplied events.',
    'src/utils/gameplay/battlearmor/vibroClawDispatch.ts',
    'L1-L170',
  ),
  mekstationDeviationSourceRef(
    'MekStation vibro-claw resolver implements the MegaMek missilesHit-times-claws cluster damage model.',
    'src/utils/gameplay/battlearmor/vibroClaw.ts',
    'L1-L125',
  ),
  mekstationDeviationSourceRef(
    'MekStation vibro-claw dispatch scenarios assert VibroClawAttackResolved payloads and per-cluster damage application.',
    'src/utils/gameplay/battlearmor/__tests__/vibroClawDispatch.test.ts',
    'L1-L210',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLE_ARMOR_STEALTH_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battle armor event factories create MimeticBonus and StealthBonus event payloads.',
    'src/utils/gameplay/gameEvents/battleArmorStealth.ts',
    'L16-L117',
  ),
  mekstationDeviationSourceRef(
    'MekStation battle armor stealth helper computes mimetic and stealth to-hit bonuses outside the BattleMech modifier matrix.',
    'src/utils/gameplay/battlearmor/stealth.ts',
    'L1-L58',
  ),
  mekstationDeviationSourceRef(
    'MekStation battle armor stealth tests pin mimetic, basic, improved, and prototype stealth helper behavior.',
    'src/utils/gameplay/battlearmor/__tests__/stealth.test.ts',
    'L41-L101',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
