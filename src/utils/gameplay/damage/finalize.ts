import type { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';

import {
  CombatLocation,
  CriticalSeverity,
  ICriticalHitResult,
  IPilotDamageResult,
} from '@/types/gameplay';

import type {
  CriticalHitEvent,
  CriticalSlotManifest,
} from '../criticalHitResolution/types';
import type { D6Roller } from '../diceTypes';

import { resolveCriticalHits } from '../criticalHitResolution';
import { isHeadHit, roll2d6 } from '../hitLocation';
import { checkCriticalHitTrigger, getCriticalHitCount } from './critical';
import { checkUnitDestruction } from './destruction';
import { applyPilotDamage } from './pilot';
import {
  IPilotDamageResultWithState,
  IResolveDamageResult,
  IUnitDamageState,
} from './types';

const DERMAL_ARMOR_PILOT_ABILITY_ID = 'dermal_armor';
const VDNI_PILOT_ABILITY_ID = 'vdni';
const BUFFERED_VDNI_PILOT_ABILITY_ID = 'bvdni';
const ARTIFICIAL_PAIN_SHUNT_PILOT_ABILITY_ID = 'artificial_pain_shunt';
const NEURAL_FEEDBACK_TARGET_NUMBER = 8;

function hasDermalArmorHeadHitProtection(state: IUnitDamageState): boolean {
  return state.pilotAbilities?.includes(DERMAL_ARMOR_PILOT_ABILITY_ID) ?? false;
}

function hasPilotAbility(state: IUnitDamageState, abilityId: string): boolean {
  return state.pilotAbilities?.includes(abilityId) ?? false;
}

function tookInternalStructureDamage(
  locationDamages: IResolveDamageResult['result']['locationDamages'],
): boolean {
  return locationDamages.some((locDamage) => locDamage.structureDamage > 0);
}

function resolvedCriticalSlotHit(
  criticalEvents: readonly CriticalHitEvent[],
): boolean {
  return criticalEvents.some((event) => event.type === 'critical_hit_resolved');
}

function resolveNeuralFeedbackPilotDamage(options: {
  readonly state: IUnitDamageState;
  readonly locationDamages: IResolveDamageResult['result']['locationDamages'];
  readonly criticalEvents: readonly CriticalHitEvent[];
  readonly roller?: D6Roller;
}): IPilotDamageResultWithState | undefined {
  const { criticalEvents, locationDamages, roller, state } = options;
  if (hasPilotAbility(state, ARTIFICIAL_PAIN_SHUNT_PILOT_ABILITY_ID)) {
    return undefined;
  }

  const hasVdni = hasPilotAbility(state, VDNI_PILOT_ABILITY_ID);
  const hasBufferedVdni = hasPilotAbility(
    state,
    BUFFERED_VDNI_PILOT_ABILITY_ID,
  );
  const shouldRollForVdni =
    hasVdni && !hasBufferedVdni && tookInternalStructureDamage(locationDamages);
  const shouldRollForBufferedVdni =
    hasBufferedVdni && resolvedCriticalSlotHit(criticalEvents);
  if (!shouldRollForVdni && !shouldRollForBufferedVdni) {
    return undefined;
  }

  const feedbackRoll = roll2d6(roller);
  if (feedbackRoll.total < NEURAL_FEEDBACK_TARGET_NUMBER) {
    return undefined;
  }

  return applyPilotDamage(state, 1, 'neural_feedback', roller);
}

type CriticalLocationDamage =
  IResolveDamageResult['result']['locationDamages'][number];
type CriticalHitResolutionOutcome = ReturnType<typeof resolveCriticalHits>;

interface CriticalDamageResolution {
  readonly state: IUnitDamageState;
  readonly criticalHits: readonly ICriticalHitResult[];
  readonly criticalEvents: readonly CriticalHitEvent[];
  readonly criticalTriggers: readonly {
    location: CombatLocation;
    count: number;
  }[];
  readonly manifest?: CriticalSlotManifest;
  readonly componentDamage?: IComponentDamageState;
}

interface DamageDestructionResolution {
  readonly state: IUnitDamageState;
  readonly destroyed: boolean;
  readonly cause?: IUnitDamageState['destructionCause'];
}

function applyHeadHitPilotDamageIfNeeded(options: {
  readonly applyHeadPilotDamage: boolean;
  readonly initialState: IUnitDamageState;
  readonly location: CombatLocation;
  readonly originalDamage: number;
  readonly roller?: D6Roller;
  readonly state: IUnitDamageState;
}): IPilotDamageResultWithState | undefined {
  const {
    applyHeadPilotDamage,
    initialState,
    location,
    originalDamage,
    roller,
    state,
  } = options;
  if (
    !applyHeadPilotDamage ||
    !isHeadHit(location) ||
    originalDamage <= 0 ||
    hasDermalArmorHeadHitProtection(initialState)
  ) {
    return undefined;
  }

  return applyPilotDamage(state, 1, 'head_hit', roller);
}

function resolveCriticalDamage(options: {
  readonly initialState: IUnitDamageState;
  readonly state: IUnitDamageState;
  readonly locationDamages: IResolveDamageResult['result']['locationDamages'];
  readonly roller?: D6Roller;
  readonly rollCriticalHits: boolean;
}): CriticalDamageResolution {
  const { initialState, locationDamages, roller, rollCriticalHits } = options;
  const ctx = initialState.criticalContext;
  let currentState = options.state;
  let runningManifest: CriticalSlotManifest | undefined = ctx?.manifest;
  let runningComponentDamage: IComponentDamageState | undefined =
    ctx?.componentDamage;
  const criticalEvents: CriticalHitEvent[] = [];
  const criticalHits: ICriticalHitResult[] = [];
  const criticalTriggers: { location: CombatLocation; count: number }[] = [];

  if (!rollCriticalHits) {
    return {
      state: currentState,
      criticalHits,
      criticalEvents,
      criticalTriggers,
      manifest: runningManifest,
      componentDamage: runningComponentDamage,
    };
  }

  for (const locDamage of locationDamages) {
    if (!shouldRollCriticalHitForLocation(locDamage)) {
      continue;
    }

    const trigger = checkCriticalHitTrigger(
      locDamage.structureDamage,
      roller,
      ctx?.criticalHitModifier,
    );
    if (!trigger.triggered) {
      continue;
    }

    const count = getCriticalHitCount(
      trigger.roll.total + (ctx?.criticalHitModifier ?? 0),
    );
    criticalTriggers.push({ location: locDamage.location, count });

    const outcome = resolveCriticalHitOutcomeForLocation({
      count,
      ctx,
      currentState,
      initialState,
      locDamage,
      roller,
      runningComponentDamage,
      runningManifest,
    });
    if (!outcome) {
      continue;
    }

    runningManifest = outcome.updatedManifest;
    runningComponentDamage = outcome.updatedComponentDamage;
    currentState = applyCriticalHitEdgePointChange(
      currentState,
      outcome.edgePointsRemaining,
    );
    criticalEvents.push(...outcome.events);
    criticalHits.push(...mapCriticalHitResults(locDamage.location, outcome));
  }

  return {
    state: currentState,
    criticalHits,
    criticalEvents,
    criticalTriggers,
    manifest: runningManifest,
    componentDamage: runningComponentDamage,
  };
}

function shouldRollCriticalHitForLocation(
  locDamage: CriticalLocationDamage,
): boolean {
  return locDamage.structureDamage > 0 && !locDamage.destroyed;
}

function resolveCriticalHitOutcomeForLocation(options: {
  readonly count: number;
  readonly ctx: IUnitDamageState['criticalContext'];
  readonly currentState: IUnitDamageState;
  readonly initialState: IUnitDamageState;
  readonly locDamage: CriticalLocationDamage;
  readonly roller?: D6Roller;
  readonly runningComponentDamage?: IComponentDamageState;
  readonly runningManifest?: CriticalSlotManifest;
}): CriticalHitResolutionOutcome | undefined {
  const {
    count,
    ctx,
    currentState,
    initialState,
    locDamage,
    roller,
    runningComponentDamage,
    runningManifest,
  } = options;
  if (
    !ctx ||
    runningManifest === undefined ||
    runningComponentDamage === undefined ||
    roller === undefined
  ) {
    return undefined;
  }

  return resolveCriticalHits(
    ctx.unitId,
    locDamage.location,
    runningManifest,
    runningComponentDamage,
    roller,
    count,
    ctx.armorType,
    {
      pilotAbilities: initialState.pilotAbilities ?? [],
      edgePointsRemaining: currentState.edgePointsRemaining,
      turn: initialState.turn,
      unitId: initialState.unitId,
      criticalHitModifier: ctx.criticalHitModifier,
      optionalRules: ctx.optionalRules,
    },
  );
}

function applyCriticalHitEdgePointChange(
  currentState: IUnitDamageState,
  edgePointsRemaining: number | undefined,
): IUnitDamageState {
  if (edgePointsRemaining === undefined) {
    return currentState;
  }
  return {
    ...currentState,
    edgePointsRemaining,
  };
}

function mapCriticalHitResults(
  location: CombatLocation,
  outcome: CriticalHitResolutionOutcome,
): ICriticalHitResult[] {
  return outcome.hits.map((hit) => ({
    location,
    severity: outcome.locationBlownOff
      ? CriticalSeverity.LimbBlownOff
      : CriticalSeverity.Standard,
    slotRoll: {
      dice: [0, 0],
      total: 0,
      isSnakeEyes: false,
      isBoxcars: false,
    },
    slot: {
      slotIndex: hit.slot.slotIndex,
      equipment: hit.slot.componentName,
      destroyed: hit.slotDestroyed !== false,
    },
    effect: hit.effect,
  }));
}

function resolveDamageDestruction(
  state: IUnitDamageState,
  criticalEvents: readonly CriticalHitEvent[],
): DamageDestructionResolution {
  const {
    state: stateAfterDestruction,
    destroyed,
    cause,
  } = checkUnitDestruction(state);
  if (destroyed) {
    return { state: stateAfterDestruction, destroyed, cause };
  }

  const eventCause = findCriticalEventDestructionCause(criticalEvents);
  if (!eventCause) {
    return { state: stateAfterDestruction, destroyed, cause };
  }

  return {
    state:
      stateAfterDestruction.destroyed === false
        ? {
            ...stateAfterDestruction,
            destroyed: true,
            destructionCause: eventCause,
          }
        : stateAfterDestruction,
    destroyed: true,
    cause: eventCause,
  };
}

function findCriticalEventDestructionCause(
  criticalEvents: readonly CriticalHitEvent[],
): IUnitDamageState['destructionCause'] | undefined {
  for (const event of criticalEvents) {
    if (event.type !== 'unit_destroyed') {
      continue;
    }
    if (event.payload.cause === 'damage') {
      return 'engine_destroyed';
    }
    return event.payload.cause;
  }
  return undefined;
}

export function finalizeDamageResolution(options: {
  readonly initialState: IUnitDamageState;
  readonly stateAfterDamage: IUnitDamageState;
  readonly location: CombatLocation;
  readonly originalDamage: number;
  readonly locationDamages: IResolveDamageResult['result']['locationDamages'];
  readonly roller?: D6Roller;
  readonly applyHeadPilotDamage: boolean;
  readonly rollCriticalHits: boolean;
}): IResolveDamageResult {
  const {
    applyHeadPilotDamage,
    initialState,
    location,
    locationDamages,
    originalDamage,
    roller,
    rollCriticalHits,
    stateAfterDamage,
  } = options;
  let currentState = stateAfterDamage;

  let pilotDamage: IPilotDamageResult | undefined;
  const headHitPilotDamage = applyHeadHitPilotDamageIfNeeded({
    applyHeadPilotDamage,
    initialState,
    location,
    originalDamage,
    roller,
    state: currentState,
  });
  if (headHitPilotDamage) {
    currentState = headHitPilotDamage.state;
    pilotDamage = headHitPilotDamage.result;
  }

  const criticalDamage = resolveCriticalDamage({
    initialState,
    state: currentState,
    locationDamages,
    roller,
    rollCriticalHits,
  });
  currentState = criticalDamage.state;

  const neuralFeedbackPilotDamage = resolveNeuralFeedbackPilotDamage({
    state: currentState,
    locationDamages,
    criticalEvents: criticalDamage.criticalEvents,
    roller,
  });
  if (neuralFeedbackPilotDamage !== undefined) {
    currentState = neuralFeedbackPilotDamage.state;
  }

  const destruction = resolveDamageDestruction(
    currentState,
    criticalDamage.criticalEvents,
  );

  return {
    state: destruction.state,
    result: {
      locationDamages,
      criticalHits: [...criticalDamage.criticalHits],
      pilotDamage,
      unitDestroyed: destruction.destroyed,
      destructionCause: destruction.cause,
    },
    neuralFeedbackPilotDamage: neuralFeedbackPilotDamage?.result,
    componentDamage: criticalDamage.componentDamage,
    criticalEvents:
      criticalDamage.criticalEvents.length > 0
        ? [...criticalDamage.criticalEvents]
        : undefined,
    criticalTriggers:
      criticalDamage.criticalTriggers.length > 0
        ? [...criticalDamage.criticalTriggers]
        : undefined,
    manifest: criticalDamage.manifest,
  };
}
