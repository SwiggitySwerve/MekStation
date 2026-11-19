/**
 * Test files allowed to append onto a game session the event-log owner did
 * not produce (src/__tests__/helpers/unownedAppendGuard.ts), measured by the
 * A6 collector over the full unit project (C4 ruling, option 2). Every other
 * test file fails on such an append.
 *
 * Categories:
 * - production-path: the session comes from production code outside the owner;
 *   the entry leaves with that producer's follow-up fix.
 * - fixture-fold-equal: a hand-built fixture whose state equals fold(events).
 * - fixture-fold-diverges: a hand-built fixture whose state is not the fold of
 *   its events. The append refolds the full log (main, and P1's path for
 *   unowned sessions), so assertions after it see fold(events). Owed rewrite
 *   through createGameSession / hydrateGameSessionFromEvents / appendEvent.
 *
 * The list may only shrink: UNOWNED_APPEND_CATEGORY_CEILINGS pins today's
 * count per category (src/__tests__/architecture/unownedAppendAllowList.test.ts),
 * so adding a file is a deliberate edit of both.
 */
export type UnownedAppendCategory =
  | 'production-path'
  | 'fixture-fold-equal'
  | 'fixture-fold-diverges';

export interface IUnownedAppendAllowance {
  readonly category: UnownedAppendCategory;
  readonly reason: string;
}

export const UNOWNED_APPEND_ALLOWED_TEST_FILES: Readonly<
  Record<string, IUnownedAppendAllowance>
> = {
  'src/__tests__/unit/utils/gameplay/integrateDamagePipeline.smoke.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: Object.<anonymous> (integrateDamagePipeline.smoke.test-helpers.ts)',
  },
  'src/components/gameplay/__tests__/addPhysicalAttackPhaseUI.smoke.03.test.tsx':
    {
      category: 'fixture-fold-diverges',
      reason:
        'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
    },
  'src/engine/__tests__/interactiveRunningDamagePsr.wiring.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: src/engine/__tests__/interactiveRunningDamagePsr.wiring.test.ts:582:35',
  },
  'src/engine/__tests__/InteractiveSession.ai.activation.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: runInteractiveSessionWeaponAI (InteractiveSession.ai.ts)',
  },
  'src/engine/__tests__/InteractiveSession.attackProjectionAgreement.scenario.test.ts':
    {
      category: 'fixture-fold-diverges',
      reason:
        'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declareInteractiveSessionAttackGroup (InteractiveSession.actions.attack.ts)',
    },
  'src/engine/__tests__/InteractiveSession.attackProjectionHistory.scenario.test.ts':
    {
      category: 'fixture-fold-diverges',
      reason:
        'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declareInteractiveSessionAttackGroup (InteractiveSession.actions.attack.ts)',
    },
  'src/engine/__tests__/InteractiveSession.matchLog.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendAndPersistInteractiveSessionEvent (InteractiveSession.sessionEvents.ts)',
  },
  'src/engine/__tests__/InteractiveSession.torsoTwist.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: torsoTwist (gameSessionTorsoTwist.ts)',
  },
  'src/engine/__tests__/interactiveTerrainPsr.wiring.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendInteractiveMovementInvalid (InteractiveSession.actions.movementPosture.ts)',
  },
  'src/lib/p2p/__tests__/hostIntentRouter.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: Object.appendEvent (hostIntentRouter.test.ts)',
  },
  'src/lib/p2p/__tests__/intentTranslation.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: translateDeclareAttack (intentTranslationCombatTranslators.ts)',
  },
  'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.02.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendHeatSourcesAndDissipation (gameSessionHeat.sources.ts)',
  },
  'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.03.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendHeatSourcesAndDissipation (gameSessionHeat.sources.ts)',
  },
  'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.04.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendHeatSourcesAndDissipation (gameSessionHeat.sources.ts)',
  },
  'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendHeatSourcesAndDissipation (gameSessionHeat.sources.ts)',
  },
  'src/simulation/runner/__tests__/perTurnReset.parity.characterization.test.ts':
    {
      category: 'fixture-fold-diverges',
      reason:
        'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendHeatSourcesAndDissipation (gameSessionHeat.sources.ts)',
    },
  'src/stores/__tests__/useGameplayStore.combatFlows.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/stores/__tests__/useGameplayStore.utilityActions.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: attemptStandUp (gameSessionPSR.ts)',
  },
  'src/testing/__tests__/tactical-map.combat-scenarios.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events (via the tactical-map scenario harness); append refolds (main and P1 unowned path); dominant: declareInteractiveSessionAttackGroup (InteractiveSession.actions.attack.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.05.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.06.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.07.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.08.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.09.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.10.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.11.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.12.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.13.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.14.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.15.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.16.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.17.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.18.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.19.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/combatAirborne.transport.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: payload (combatAirborne.transport.test.ts)',
  },
  'src/utils/gameplay/__tests__/combatProjectionShared/sharedProjection.scenarioCorpus.test.ts':
    {
      category: 'fixture-fold-diverges',
      reason:
        'hand-built fixture sets state outside events (via the tactical-map scenario harness); append refolds (main and P1 unowned path); dominant: declareInteractiveSessionAttackGroup (InteractiveSession.actions.attack.ts)',
    },
  'src/utils/gameplay/__tests__/declareAttack.gunnerySpecialist.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declaration (declareAttack.gunnerySpecialist.test.ts)',
  },
  'src/utils/gameplay/__tests__/declareAttack.invalidTarget.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: src/utils/gameplay/gameSessionAttackResolutionValidation.ts:70:18',
  },
  'src/utils/gameplay/__tests__/declareAttack.toHitInputs.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: Object.<anonymous> (declareAttack.toHitInputs.test.ts)',
  },
  'src/utils/gameplay/__tests__/declareAttack.toHitStateHydration.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: Object.<anonymous> (declareAttack.toHitStateHydration.02.fragment.ts)',
  },
  'src/utils/gameplay/__tests__/gameSession.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: Object.<anonymous> (gameSession.09.fragment.ts)',
  },
  'src/utils/gameplay/__tests__/gameSessionGoProne.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: goProne (gameSessionProne.ts)',
  },
  'src/utils/gameplay/__tests__/gameSessionMovementEnhancements.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: activateMovementEnhancement (gameSessionMovementEnhancements.ts)',
  },
  'src/utils/gameplay/__tests__/gameSessionPhysicalRange.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePhysicalAttack (gameSessionPhysical.ts)',
  },
  'src/utils/gameplay/__tests__/gameSessionPSR.automaticFailure.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendPsrResolved (gameSessionPSRResolution.ts)',
  },
  'src/utils/gameplay/__tests__/gameSessionPSR.quirks.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendPsrResolved (gameSessionPSRResolution.ts)',
  },
  'src/utils/gameplay/__tests__/gameSessionTorsoTwist.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: torsoTwist (gameSessionTorsoTwist.ts)',
  },
  'src/utils/gameplay/__tests__/missileAmmoReadiness.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: resolveAttack (gameSessionAttackResolution.ts)',
  },
  'src/utils/gameplay/__tests__/nativeNeuralInterfaceTransport.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendPsrResolved (gameSessionPSRResolution.ts)',
  },
  'src/utils/gameplay/__tests__/quirkModifiers.nativeHardPilot.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendPsrResolved (gameSessionPSRResolution.ts)',
  },
  'src/utils/gameplay/__tests__/quirkModifiers.nativePiloting.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: appendPsrResolved (gameSessionPSRResolution.ts)',
  },
  'src/utils/gameplay/__tests__/requestSpot.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: Object.<anonymous> (requestSpot.test.ts)',
  },
  'src/utils/gameplay/__tests__/unitLifecycle.characterization.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: declarePlayerWithdrawal (withdrawalProcessing.ts)',
  },
  'src/utils/gameplay/morale/__tests__/withdrawalProcessing.onField.test.ts': {
    category: 'fixture-fold-diverges',
    reason:
      'hand-built fixture sets state outside events; append refolds (main and P1 unowned path); dominant: applyWithdrawalEdgeExits (withdrawalProcessing.ts)',
  },
  'src/__tests__/unit/utils/gameplay/implementPhysicalAttackPhase.smoke.test.ts':
    {
      category: 'fixture-fold-equal',
      reason: 'hand-built fixture; state equals fold(events)',
    },
  'src/__tests__/unit/utils/gameplay/physicalAttackChargeDFA.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/__tests__/unit/utils/gameplay/wireHeatGenerationAndEffects.smoke.test.ts':
    {
      category: 'fixture-fold-equal',
      reason: 'hand-built fixture; state equals fold(events)',
    },
  'src/__tests__/unit/utils/gameplay/wirePilotingSkillRolls.phaseLoop.test.ts':
    {
      category: 'fixture-fold-equal',
      reason: 'hand-built fixture; state equals fold(events)',
    },
  'src/__tests__/unit/utils/gameplay/wirePilotingSkillRolls.smoke.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/lib/combat/outcome/__tests__/combatOutcome.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/lib/multiplayer/server/__tests__/scratchDecisionProjection.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/lib/multiplayer/server/__tests__/shadowOutcomeSuppression.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/utils/gameplay/__tests__/heatSystem.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/utils/gameplay/__tests__/quirkModifiers.nativeAntiAir.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/utils/gameplay/__tests__/quirkModifiers.prototypeRanged.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/utils/gameplay/__tests__/quirkModifiers.weakLegs.test.ts': {
    category: 'fixture-fold-equal',
    reason: 'hand-built fixture; state equals fold(events)',
  },
  'src/__tests__/integration/nonMechRunner.integration.test.ts': {
    category: 'production-path',
    reason:
      'resolved by the SimulationRunner.nativeUnits production follow-up (runner state and log wrapped as a session; state diverges from fold(events))',
  },
  'src/lib/multiplayer/server/__tests__/coopMissionCreate.test.ts': {
    category: 'production-path',
    reason:
      'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
  },
  'src/lib/multiplayer/server/__tests__/CoopOpponentDriver.test.ts': {
    category: 'production-path',
    reason:
      'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
  },
  'src/lib/multiplayer/server/__tests__/durableViewerDelivery.test.ts': {
    category: 'production-path',
    reason:
      'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
  },
  'src/lib/multiplayer/server/__tests__/journalAuthorityRollbackProof.test.ts':
    {
      category: 'production-path',
      reason:
        'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
    },
  'src/lib/multiplayer/server/__tests__/MatchRecovery.canonicalUnits.test.ts': {
    category: 'production-path',
    reason:
      'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
  },
  'src/lib/multiplayer/server/__tests__/reconnectPersistence.integration.test.ts':
    {
      category: 'production-path',
      reason:
        'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
    },
  'src/lib/multiplayer/server/__tests__/sealedChoiceDelivery.test.ts': {
    category: 'production-path',
    reason:
      'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
  },
  'src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindLiveReplay.test.ts':
    {
      category: 'production-path',
      reason:
        'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
    },
  'src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindRebuild.test.ts':
    {
      category: 'production-path',
      reason:
        'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
    },
  'src/lib/multiplayer/server/__tests__/ServerMatchHostRewindRebuild.serverUnits.test.ts':
    {
      category: 'production-path',
      reason:
        'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
    },
  'src/lib/multiplayer/server/history/__tests__/matchJournalBranchSegmentReader.sqlite.test.ts':
    {
      category: 'production-path',
      reason:
        'resolved by the MatchSessionProjector production follow-up (JSON-canonical fold; state equals fold(events))',
    },
  'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.08.test.ts':
    {
      category: 'production-path',
      reason:
        'resolved by the SimulationRunner.nativeUnits production follow-up (runner state and log wrapped as a session; state diverges from fold(events))',
    },
};

/** Today's count per category; each may only go down. */
export const UNOWNED_APPEND_CATEGORY_CEILINGS: Readonly<
  Record<UnownedAppendCategory, number>
> = {
  'production-path': 13,
  'fixture-fold-equal': 12,
  'fixture-fold-diverges': 55,
};
