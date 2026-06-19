import type {
  IGameEvent,
  IGameState,
  IHexGrid,
  IPhysicalDominoStepOutDecisionPayload,
} from '@/types/gameplay';
import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import type {
  IPhysicalAttackInput,
  PhysicalAttackINarcPodSelection,
  PhysicalAttackLimb,
  PhysicalAttackType,
  resolveDfaMissFallDamage,
  resolvePhysicalAttack,
} from '@/utils/gameplay/physicalAttacks';

import type { computePhysicalDisplacementOutcome } from './physicalAttackDisplacement';

export type PhysicalAttackResult = ReturnType<typeof resolvePhysicalAttack>;
export type PhysicalAttackUnit = IGameState['units'][string];
export type PhysicalDisplacementOutcome = ReturnType<
  typeof computePhysicalDisplacementOutcome
>;
export type PhysicalDisplacement =
  PhysicalDisplacementOutcome['displacements'][number];
export type DfaMissFall = ReturnType<typeof resolveDfaMissFallDamage>;
export type D6Roller = () => number;

export interface PhysicalAttackResolutionBaseOptions {
  readonly grid?: IHexGrid;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly unitId: string;
  readonly unit: PhysicalAttackUnit;
  readonly target: PhysicalAttackUnit;
  readonly attackType: PhysicalAttackType;
  readonly attackInput: IPhysicalAttackInput;
  readonly result: PhysicalAttackResult;
  readonly d6Roller: D6Roller;
  readonly optionalRules?: readonly string[];
  readonly manifestsByUnit?: Map<string, CriticalSlotManifest>;
  readonly effectiveLimb?: PhysicalAttackLimb;
  readonly declaredTwoHandedZweihander: boolean;
  readonly selectedINarcPod?: PhysicalAttackINarcPodSelection;
  readonly blockerStepOutDecision?: IPhysicalDominoStepOutDecisionPayload;
  readonly targetHasINarcPods: boolean;
}

export type PhysicalAttackResolutionOptions =
  PhysicalAttackResolutionBaseOptions & {
    readonly state: IGameState;
  };
