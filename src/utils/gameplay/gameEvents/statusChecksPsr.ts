import type { IPSRTriggerTarget } from '@/types/gameplay/GameSessionStateTypes';

import {
  GameEventType,
  IGameEvent,
  IPSRResolvedPayload,
  IPSRResolutionTarget,
  IPSRTriggeredPayload,
  PSRTrigger,
} from '@/types/gameplay';
import { projectPsrTriggerTarget } from '@/utils/gameplay/pilotingSkillRolls/eventTargets';

import type { GameplayEventContextArgs } from './eventContext';

import * as statusCheckCommon from './statusChecksCommon';

type PSRTriggeredEventArgs = [
  ...GameplayEventContextArgs,
  reason: string,
  additionalModifier: number,
  triggerSource: string,
  basePilotingSkill?: number,
  reasonCode?: PSRTrigger,
  fixedTargetNumber?: number,
];

export type ICreatePSRTriggeredEventInput =
  statusCheckCommon.IStatusCheckEventContext &
    IPSRTriggerTarget & {
      readonly reason: string;
      readonly additionalModifier: number;
      readonly triggerSource: string;
      readonly basePilotingSkill?: number;
      readonly reasonCode?: PSRTrigger;
    };

type PSRResolvedEventArgs = [
  ...GameplayEventContextArgs,
  targetNumber: number,
  roll: number,
  modifiers: number,
  passed: boolean,
  reason: string,
  reasonCode?: PSRTrigger,
];

export type ICreatePSRResolvedEventInput =
  statusCheckCommon.IStatusCheckEventContext &
    IPSRResolutionTarget & {
      readonly roll: number;
      readonly modifiers: number;
      readonly passed: boolean;
      readonly reason: string;
      readonly reasonCode?: PSRTrigger;
    };

export function createPSRTriggeredEvent(
  ...args: [ICreatePSRTriggeredEventInput] | PSRTriggeredEventArgs
): IGameEvent {
  const input = normalizePSRTriggeredEventInput(args);
  const payload: IPSRTriggeredPayload = {
    unitId: input.unitId,
    reason: input.reason,
    additionalModifier: input.additionalModifier,
    triggerSource: input.triggerSource,
    ...(input.basePilotingSkill !== undefined
      ? { basePilotingSkill: input.basePilotingSkill }
      : {}),
    ...(input.reasonCode !== undefined ? { reasonCode: input.reasonCode } : {}),
    ...projectPsrTriggerTarget(input),
  };

  return statusCheckCommon.createStatusCheckEvent(
    GameEventType.PSRTriggered,
    input,
    payload,
  );
}

export function createPSRResolvedEvent(
  ...args: [ICreatePSRResolvedEventInput] | PSRResolvedEventArgs
): IGameEvent {
  const input = normalizePSRResolvedEventInput(args);
  const details = {
    roll: input.roll,
    modifiers: input.modifiers,
    passed: input.passed,
    reason: input.reason,
    ...(input.reasonCode !== undefined ? { reasonCode: input.reasonCode } : {}),
  };
  const payload: IPSRResolvedPayload = input.automaticFailure
    ? {
        unitId: input.unitId,
        automaticFailure: true,
        ...details,
        passed: input.passed,
      }
    : { unitId: input.unitId, targetNumber: input.targetNumber, ...details };

  return statusCheckCommon.createStatusCheckEvent(
    GameEventType.PSRResolved,
    input,
    payload,
  );
}

function normalizePSRTriggeredEventInput(
  args: [ICreatePSRTriggeredEventInput] | PSRTriggeredEventArgs,
): ICreatePSRTriggeredEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    reason,
    additionalModifier,
    triggerSource,
    basePilotingSkill,
    reasonCode,
    fixedTargetNumber,
  ] = args as PSRTriggeredEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    reason,
    additionalModifier,
    triggerSource,
    ...(basePilotingSkill !== undefined ? { basePilotingSkill } : {}),
    ...(reasonCode !== undefined ? { reasonCode } : {}),
    ...(fixedTargetNumber !== undefined ? { fixedTargetNumber } : {}),
  };
}

function normalizePSRResolvedEventInput(
  args: [ICreatePSRResolvedEventInput] | PSRResolvedEventArgs,
): ICreatePSRResolvedEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    targetNumber,
    roll,
    modifiers,
    passed,
    reason,
    reasonCode,
  ] = args as PSRResolvedEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    targetNumber,
    roll,
    modifiers,
    passed,
    reason,
    ...(reasonCode !== undefined ? { reasonCode } : {}),
  };
}
