import { ArmorTypeEnum } from '@/types/construction/ArmorType';

import { D6Roller } from '../hitLocation';
import { halveCritCount, isFerroLamellorArmor, isHardenedArmor } from './armor';
import { LETHAL_PILOT_WOUNDS } from './constants';
import { applyCriticalHitEffect } from './effects';
import {
  applyCriticalResultToState,
  createResolutionResult,
  createResolutionState,
  getSlotsForLocation,
  ICriticalResolutionState,
  isSlotCriticalEffectCandidate,
  markLocationSlotsDestroyed,
  markResolvedSlotDestroyed,
} from './resolverState';
import { rollCriticalHits, selectCriticalSlotWithEdge } from './selection';
import {
  CombatLocation,
  CriticalSlotManifest,
  IComponentDamageState,
  ICriticalEdgeOptions,
  ICriticalHitApplicationResult,
  ICriticalResolutionResult,
  ICriticalSlotEntry,
} from './types';

type ResolveCriticalHitsArgs = [
  unitId: string,
  location: CombatLocation,
  manifest: CriticalSlotManifest,
  componentDamage: IComponentDamageState,
  diceRoller: D6Roller,
  forceCrits?: number,
  armorType?: ArmorTypeEnum,
  edgeOptions?: ICriticalEdgeOptions,
];

type ProcessTacArgs = [
  unitId: string,
  tacLocation: CombatLocation,
  manifest: CriticalSlotManifest,
  componentDamage: IComponentDamageState,
  diceRoller: D6Roller,
  armorType?: ArmorTypeEnum,
  edgeOptions?: ICriticalEdgeOptions,
];

interface ICriticalHitsResolutionInput {
  readonly unitId: string;
  readonly location: CombatLocation;
  readonly manifest: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly diceRoller: D6Roller;
  readonly forceCrits?: number;
  readonly armorType?: ArmorTypeEnum;
  readonly edgeOptions: ICriticalEdgeOptions;
}

interface ITacResolutionInput {
  readonly unitId: string;
  readonly tacLocation: CombatLocation;
  readonly manifest: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly diceRoller: D6Roller;
  readonly armorType?: ArmorTypeEnum;
  readonly edgeOptions: ICriticalEdgeOptions;
}

interface ICriticalHitDetermination {
  readonly critCount: number;
  readonly limbBlownOff: boolean;
  readonly headDestroyed: boolean;
}

export function resolveCriticalHits(
  ...args: ResolveCriticalHitsArgs
): ICriticalResolutionResult {
  const input = createCriticalHitsInput(args);
  const determination = determineCriticalHits(input);
  const state = createResolutionState(input);

  if (determination.limbBlownOff) {
    return resolveBlownOffLocation(input, state);
  }

  if (determination.headDestroyed) {
    return resolveDestroyedHead(input, state);
  }

  resolveSelectedCriticalHits(input, state, determination.critCount);
  return createResolutionResult(state, {
    locationBlownOff: false,
    headDestroyed: false,
  });
}

export function checkTACTrigger(
  hitLocationRoll: number,
  firingArc: 'front' | 'rear' | 'left' | 'right',
): CombatLocation | null {
  if (hitLocationRoll !== 2) return null;

  switch (firingArc) {
    case 'front':
    case 'rear':
      return 'center_torso';
    case 'left':
      return 'left_torso';
    case 'right':
      return 'right_torso';
  }
}

export function processTAC(...args: ProcessTacArgs): ICriticalResolutionResult {
  const input = createTacInput(args);
  if (isHardenedArmor(input.armorType)) {
    return {
      hits: [],
      events: [],
      updatedManifest: input.manifest,
      updatedComponentDamage: input.componentDamage,
      locationBlownOff: false,
      headDestroyed: false,
      unitDestroyed: false,
    };
  }

  return resolveCriticalHits(
    input.unitId,
    input.tacLocation,
    input.manifest,
    input.componentDamage,
    input.diceRoller,
    1,
    input.armorType,
    input.edgeOptions,
  );
}

function createCriticalHitsInput(
  args: ResolveCriticalHitsArgs,
): ICriticalHitsResolutionInput {
  const [
    unitId,
    location,
    manifest,
    componentDamage,
    diceRoller,
    forceCrits,
    armorType,
    edgeOptions = {},
  ] = args;

  return {
    unitId,
    location,
    manifest,
    componentDamage,
    diceRoller,
    forceCrits,
    armorType,
    edgeOptions,
  };
}

function createTacInput(args: ProcessTacArgs): ITacResolutionInput {
  const [
    unitId,
    tacLocation,
    manifest,
    componentDamage,
    diceRoller,
    armorType,
    edgeOptions = {},
  ] = args;

  return {
    unitId,
    tacLocation,
    manifest,
    componentDamage,
    diceRoller,
    armorType,
    edgeOptions,
  };
}

function determineCriticalHits(
  input: ICriticalHitsResolutionInput,
): ICriticalHitDetermination {
  if (input.forceCrits !== undefined) {
    return {
      critCount: input.forceCrits,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  if (isHardenedArmor(input.armorType)) {
    return determineHardenedArmorCriticalHits(input);
  }

  const determination = rollCriticalHits(
    input.location,
    input.diceRoller,
    input.edgeOptions.criticalHitModifier,
  );
  return {
    ...determination,
    critCount:
      isFerroLamellorArmor(input.armorType) && determination.criticalHits > 0
        ? halveCritCount(determination.criticalHits)
        : determination.criticalHits,
  };
}

function determineHardenedArmorCriticalHits(
  input: ICriticalHitsResolutionInput,
): ICriticalHitDetermination {
  const roll1 = rollCriticalHits(
    input.location,
    input.diceRoller,
    input.edgeOptions.criticalHitModifier,
  );
  const roll2 = rollCriticalHits(
    input.location,
    input.diceRoller,
    input.edgeOptions.criticalHitModifier,
  );

  return {
    critCount:
      roll1.criticalHits === 0 || roll2.criticalHits === 0
        ? 0
        : Math.min(roll1.criticalHits, roll2.criticalHits),
    limbBlownOff: roll1.limbBlownOff && roll2.limbBlownOff,
    headDestroyed: roll1.headDestroyed && roll2.headDestroyed,
  };
}

function resolveBlownOffLocation(
  input: ICriticalHitsResolutionInput,
  state: ICriticalResolutionState,
): ICriticalResolutionResult {
  const slots = getSlotsForLocation(state.currentManifest, input.location);
  state.currentManifest = markLocationSlotsDestroyed(
    state.currentManifest,
    input.location,
  );

  for (const slot of slots.filter(isSlotCriticalEffectCandidate)) {
    const result = applyCriticalHitEffect(
      slot,
      input.unitId,
      input.location,
      state.currentDamage,
    );
    applyCriticalResultToState(state, result);
  }

  return createResolutionResult(state, {
    locationBlownOff: true,
    headDestroyed: false,
  });
}

function resolveDestroyedHead(
  input: ICriticalHitsResolutionInput,
  state: ICriticalResolutionState,
): ICriticalResolutionResult {
  state.allEvents.push(
    {
      type: 'pilot_hit',
      payload: {
        unitId: input.unitId,
        wounds: LETHAL_PILOT_WOUNDS,
        totalWounds: LETHAL_PILOT_WOUNDS,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      },
    },
    {
      type: 'unit_destroyed',
      payload: {
        unitId: input.unitId,
        cause: 'pilot_death',
      },
    },
  );
  state.currentManifest = markLocationSlotsDestroyed(
    state.currentManifest,
    input.location,
  );
  state.unitDestroyed = true;
  state.destructionCause = 'pilot_death';

  return createResolutionResult(state, {
    locationBlownOff: false,
    headDestroyed: true,
  });
}

function resolveSelectedCriticalHits(
  input: ICriticalHitsResolutionInput,
  state: ICriticalResolutionState,
  initialCritCount: number,
): void {
  let critCount = initialCritCount;
  for (let i = 0; i < critCount; i++) {
    const selection = selectCriticalSlotWithEdge(
      state.currentManifest,
      input.location,
      input.diceRoller,
      {
        ...input.edgeOptions,
        edgePointsRemaining: state.currentEdgePointsRemaining,
        unitId: input.unitId,
      },
    );
    if (!selection.slot) break;

    const result = resolveSelectedCriticalSlot(
      input,
      state,
      selection.slot,
      selection.edgePointsRemaining,
    );
    if (result.secondaryCriticals !== undefined) {
      critCount += result.secondaryCriticals;
    }
  }
}

function resolveSelectedCriticalSlot(
  input: ICriticalHitsResolutionInput,
  state: ICriticalResolutionState,
  slot: ICriticalSlotEntry,
  edgePointsAfterSelection: number | undefined,
): ICriticalHitApplicationResult {
  if (edgePointsAfterSelection !== undefined) {
    state.currentEdgePointsRemaining = edgePointsAfterSelection;
  }

  const result = applyCriticalHitEffect(
    slot,
    input.unitId,
    input.location,
    state.currentDamage,
    input.edgeOptions,
  );
  state.currentManifest = markResolvedSlotDestroyed(
    state.currentManifest,
    input.location,
    slot,
    result,
  );
  applyCriticalResultToState(state, result, edgePointsAfterSelection);
  return result;
}
