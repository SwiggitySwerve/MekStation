import { create } from 'zustand';

import type { InteractiveSession } from '@/engine/GameEngine';
import type {
  IPhysicalAttackInput,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import {
  IGameSession,
  MovementType,
  type PhysicalAttackINarcPodSelection,
} from '@/types/gameplay';
import { isZweihanderPhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';

import type { IPhysicalAttackPlan } from './useGameplayStore.combatFlowTypes';

export interface IPhysicalAttackPlanState {
  readonly physicalAttackPlan: IPhysicalAttackPlan;
  setPhysicalAttackTarget: (unitId: string | null) => void;
  setPhysicalAttackType: (
    attackType: PhysicalAttackType | null,
    limb?: PhysicalAttackLimb | null,
  ) => void;
  stagePhysicalAttackCommand: (
    targetUnitId: string | null,
    attackType: PhysicalAttackType,
    limb?: PhysicalAttackLimb | null,
  ) => void;
  setPhysicalAttackTwoHandedZweihander: (enabled: boolean) => void;
  setPhysicalAttackINarcPod: (
    pod: PhysicalAttackINarcPodSelection | undefined,
  ) => void;
  clearPhysicalAttackPlan: () => void;
  commitPhysicalAttack: (
    args: ICommitPhysicalAttackArgs,
  ) => IGameSession | null;
}

export interface ICommitPhysicalAttackArgs {
  readonly interactiveSession: InteractiveSession;
  readonly attackerId: string;
  readonly attackerPiloting: number;
  readonly attackerTonnage?: number;
  readonly targetTonnage?: number;
  readonly attackerUnitType?: IPhysicalAttackInput['attackerUnitType'];
  readonly attackerMovementMode?: IPhysicalAttackInput['attackerMovementMode'];
  readonly optionalRules?: IPhysicalAttackInput['optionalRules'];
  readonly targetUnitType?: IPhysicalAttackInput['targetUnitType'];
  readonly hexesMoved?: number;
  readonly attackerRanThisTurn?: boolean;
  readonly attackerJumpedThisTurn?: boolean;
  readonly weaponsFiredFromLeftArm?: readonly string[];
  readonly weaponsFiredFromRightArm?: readonly string[];
  readonly elevationContext?: IPhysicalAttackInput['elevationContext'];
  readonly terrainContext?: IPhysicalAttackInput['terrainContext'];
}

const EMPTY_PHYSICAL_PLAN: IPhysicalAttackPlan = {
  targetUnitId: null,
  attackType: null,
  limb: null,
  twoHandedZweihander: false,
};

export const usePhysicalAttackPlanStore = create<IPhysicalAttackPlanState>(
  (set) => ({
    physicalAttackPlan: EMPTY_PHYSICAL_PLAN,

    setPhysicalAttackTarget: (unitId) =>
      set((state) => {
        const { selectedINarcPod: _selectedINarcPod, ...basePlan } =
          state.physicalAttackPlan;
        return {
          physicalAttackPlan: {
            ...basePlan,
            targetUnitId: unitId,
          },
        };
      }),

    setPhysicalAttackType: (attackType, limb = null) =>
      set((state) => {
        const { selectedINarcPod, ...basePlan } = state.physicalAttackPlan;
        const nextPlan: IPhysicalAttackPlan = {
          ...basePlan,
          attackType,
          limb,
          twoHandedZweihander: isZweihanderPhysicalAttackType(attackType)
            ? state.physicalAttackPlan.twoHandedZweihander
            : false,
        };
        if (attackType === 'brush-off' && selectedINarcPod !== undefined) {
          return {
            physicalAttackPlan: {
              ...nextPlan,
              selectedINarcPod,
            },
          };
        }
        return { physicalAttackPlan: nextPlan };
      }),

    stagePhysicalAttackCommand: (targetUnitId, attackType, limb = null) =>
      set((state) => {
        const { selectedINarcPod, ...basePlan } = state.physicalAttackPlan;
        const nextPlan: IPhysicalAttackPlan = {
          ...basePlan,
          targetUnitId,
          attackType,
          limb,
          twoHandedZweihander: isZweihanderPhysicalAttackType(attackType)
            ? state.physicalAttackPlan.twoHandedZweihander
            : false,
          forecastRequestId:
            (state.physicalAttackPlan.forecastRequestId ?? 0) + 1,
        };
        if (attackType === 'brush-off' && selectedINarcPod !== undefined) {
          return {
            physicalAttackPlan: {
              ...nextPlan,
              selectedINarcPod,
            },
          };
        }
        return { physicalAttackPlan: nextPlan };
      }),

    setPhysicalAttackTwoHandedZweihander: (enabled) =>
      set((state) => ({
        physicalAttackPlan: {
          ...state.physicalAttackPlan,
          twoHandedZweihander: isZweihanderPhysicalAttackType(
            state.physicalAttackPlan.attackType,
          )
            ? enabled
            : false,
        },
      })),

    setPhysicalAttackINarcPod: (pod) =>
      set((state) => {
        const { selectedINarcPod: _selectedINarcPod, ...basePlan } =
          state.physicalAttackPlan;
        return {
          physicalAttackPlan:
            pod === undefined
              ? basePlan
              : { ...basePlan, selectedINarcPod: pod },
        };
      }),

    clearPhysicalAttackPlan: () =>
      set({ physicalAttackPlan: EMPTY_PHYSICAL_PLAN }),

    commitPhysicalAttack: (args) => {
      const plan = usePhysicalAttackPlanStore.getState().physicalAttackPlan;
      if (!plan.targetUnitId || !plan.attackType) {
        return null;
      }

      const baseSession = args.interactiveSession.getSession();
      const attackerState =
        baseSession.currentState.units[args.attackerId] ?? null;
      const attackerTonnage = args.attackerTonnage ?? 65;
      const targetTonnage = args.targetTonnage ?? 65;
      const hexesMoved =
        args.hexesMoved ?? attackerState?.hexesMovedThisTurn ?? 0;

      args.interactiveSession.applyPhysicalAttack(
        args.attackerId,
        plan.targetUnitId,
        plan.attackType,
        plan.limb ?? undefined,
        {
          attackerTonnage,
          targetTonnage,
          pilotingSkill: args.attackerPiloting,
          hexesMoved,
          attackerUnitType: args.attackerUnitType,
          attackerMovementMode: args.attackerMovementMode,
          optionalRules: args.optionalRules,
          targetUnitType: args.targetUnitType,
          arm: armForPhysicalLimb(plan.limb),
          twoHandedZweihander: plan.twoHandedZweihander,
          selectedINarcPod: plan.selectedINarcPod,
          weaponsFiredFromArm:
            weaponsFiredFromArmForPhysicalLimb(plan.limb, args) ??
            attackerState?.weaponsFiredThisTurn,
          attackerRanThisTurn:
            args.attackerRanThisTurn ??
            attackerState?.movementThisTurn === MovementType.Run,
          attackerJumpedThisTurn:
            args.attackerJumpedThisTurn ??
            attackerState?.movementThisTurn === MovementType.Jump,
          elevationContext: args.elevationContext,
          terrainContext: args.terrainContext,
        },
      );

      set({ physicalAttackPlan: EMPTY_PHYSICAL_PLAN });
      return args.interactiveSession.getSession();
    },
  }),
);

function armForPhysicalLimb(
  limb: PhysicalAttackLimb | null,
): 'left' | 'right' | undefined {
  if (limb === 'leftArm') return 'left';
  if (limb === 'rightArm') return 'right';
  return undefined;
}

function weaponsFiredFromArmForPhysicalLimb(
  limb: PhysicalAttackLimb | null,
  args: ICommitPhysicalAttackArgs,
): readonly string[] | undefined {
  if (limb === 'leftArm') return args.weaponsFiredFromLeftArm;
  if (limb === 'rightArm') return args.weaponsFiredFromRightArm;
  return undefined;
}
