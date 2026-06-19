import {
  megamekSourceRefWithLineAnchor as megaMekSourceRef,
  mekstationDeviationSourceRefWithLineAnchor as mekstationDeviationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

const MEGAMEK_KICK_PUSH_PSR_HELPER_SOURCE_REF = megaMekSourceRef(
  'MegaMek getKickPushPSR builds kick/push target PSRs and applies Stable plus optional physical-PSR weight-class modifiers.',
  'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
  'L15443-L15465',
);

const LOCAL_PHYSICAL_PSR_QUEUE_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation physicalAttackPsr maps physical result flags to pending PSR factories and appends pendingPSRs through queuePendingPSR.',
    'src/simulation/runner/phases/physicalAttackPsr.ts',
    'L17-L91',
  ),
  mekstationDeviationRef(
    'MekStation runPhysicalAttackPhase queues target, attacker-hit, and attacker-miss physical PSRs after damage/displacement guards, while skipped DFA-miss falls use immediate fall handling.',
    'src/simulation/runner/phases/physicalAttack.ts',
    'L507-L531',
  ),
  mekstationDeviationRef(
    'MekStation event-sourced physical resolution emits source-aligned target and attacker PSRTriggered payloads for kick, charge, DFA, and push hit fallout.',
    'src/utils/gameplay/gameSessionPhysical.ts',
    'L945-L1024',
  ),
  mekstationDeviationRef(
    'MekStation combat PSR factories stamp canonical physical reasonCode and triggerSource values through createKickedPSR, createChargedPSR, createDFATargetPSR, createDFAAttackerPSR, createPushedPSR, createDominoEffectPSR, createKickMissPSR, createChargeMissPSR, and createDFAMissPSR.',
    'src/utils/gameplay/pilotingSkillRolls/combatFactories.ts',
    'L14-L133',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const PHYSICAL_DOMINO_EFFECT_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek TWGameManager.doEntityDisplacement recursively displaces stacking-violation blockers with PilotingRollData(..., 0, "domino effect") when they cannot or do not step out.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L9187-L9294',
  ),
  ...LOCAL_PHYSICAL_PSR_QUEUE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PHYSICAL_KICK_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek resolveKickAttack queues a normal PSR for a missed ground kick and control-rolls only airborne LAM/WIGE cases.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L11743-L11788',
  ),
  megaMekSourceRef(
    'MegaMek resolveKickAttack queues getKickPushPSR with reason "was kicked" when the hit target can fall.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L11904-L11908',
  ),
  MEGAMEK_KICK_PUSH_PSR_HELPER_SOURCE_REF,
  ...LOCAL_PHYSICAL_PSR_QUEUE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PHYSICAL_PUSH_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek resolvePushAttack queues getKickPushPSR for both successful counter-push participants that can fall.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L13417-L13430',
  ),
  megaMekSourceRef(
    'MegaMek resolvePushAttack passes the target push PSR into doEntityDisplacement on valid displacement and queues it directly when the target is immovable.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L13456-L13489',
  ),
  MEGAMEK_KICK_PUSH_PSR_HELPER_SOURCE_REF,
  ...LOCAL_PHYSICAL_PSR_QUEUE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PHYSICAL_CHARGE_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek resolveChargeDamage creates an attacker charge PSR at +2 when the charging unit is upright.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L14606-L14610',
  ),
  megaMekSourceRef(
    'MegaMek resolveChargeDamage passes +2 "was charged" target and +2 "charging" attacker PSRs into displacement after a valid charge displacement.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L14889-L14893',
  ),
  ...LOCAL_PHYSICAL_PSR_QUEUE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PHYSICAL_CHARGE_MISS_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek resolveChargeAttack moves the attacker to the missed-charge side hex with doEntityDisplacement(..., null), so a normal ChargeMiss PSR is not queued unless displacement terrain separately causes one.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L14046-L14058',
  ),
  mekstationDeviationRef(
    'MekStation createChargeMissPSR remains as a legacy/local factory, but source-backed runner miss consequences do not queue it for normal missed charges.',
    'src/utils/gameplay/pilotingSkillRolls/combatFactories.ts',
    'L96-L104',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const PHYSICAL_DFA_TARGET_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek resolveDfaAttack displaces a hit target and queues a +2 "hit by death from above" target PSR through doEntityDisplacement.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L15357-L15360',
  ),
  ...LOCAL_PHYSICAL_PSR_QUEUE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
