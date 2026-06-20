import type {
  IGameUnit,
  IUnitGameState,
} from '@/types/gameplay/GameSessionInterfaces';

import type {
  IGmCombatInterventionState,
  IGmCombatInterventionUnitState,
} from './GmCombatInterventionTypes';
import type {
  IGmPrivateMetadata,
  IGmPublicEffect,
} from './GmInterventionAuthorityTypes';

export interface IGmUnitReloadPilotSnapshot {
  readonly gunnery: number;
  readonly piloting: number;
  readonly pilotSpas?: readonly string[];
  readonly abilities?: readonly string[];
  readonly pilotToughness?: number;
  readonly edgePointsRemaining?: number;
  readonly neuralInterfaceActive?: boolean;
}

export interface IGmUnitReloadSourceSnapshot {
  readonly unit: IGameUnit;
  readonly pilot?: IGmUnitReloadPilotSnapshot;
  readonly armorLocations?: readonly string[];
  readonly structureLocations?: readonly string[];
  readonly ammoBinIds?: readonly string[];
  readonly movementProfileKey?: string;
}

export interface IGmUnitReloadManualResolution {
  readonly acceptedConflictCodes?: readonly string[];
  readonly notes?: string;
}

export interface IGmUnitReloadInterventionCommandPayload {
  readonly unitId: string;
  readonly unitRef?: string;
  readonly pilotRef?: string;
  readonly sourceUnitsByRef: Readonly<
    Record<string, IGmUnitReloadSourceSnapshot>
  >;
  readonly pilotsByRef?: Readonly<Record<string, IGmUnitReloadPilotSnapshot>>;
  readonly manualResolution?: IGmUnitReloadManualResolution;
  readonly privateMetadata: IGmPrivateMetadata;
  readonly publicSummary?: string;
  readonly visibleToPlayerIds?: readonly string[];
}

export type IGmUnitReloadInterventionUnitState = IGmCombatInterventionUnitState;

export interface IGmUnitReloadInterventionState extends IGmCombatInterventionState {
  readonly units: Record<string, IGmUnitReloadInterventionUnitState>;
  readonly sessionUnits?: readonly IGameUnit[];
  readonly gmUnitReloadEvents?: readonly IGmUnitReloadProjectedEffect[];
}

export interface IGmUnitReloadCommandProjection {
  readonly unitId: string;
  readonly unitRef: string;
  readonly pilotRef: string;
}

export interface IGmUnitReloadProjectedEffect {
  readonly type: 'gm.unit_reload.rehydrated';
  readonly family: 'unit-reload';
  readonly interventionId?: string;
  readonly unitId: string;
  readonly unitRef: string;
  readonly pilotRef: string;
  readonly before: {
    readonly unit: IGmUnitReloadInterventionUnitState;
    readonly sessionUnit: IGameUnit;
  };
  readonly after: {
    readonly unit: IUnitGameState;
    readonly sessionUnit: IGameUnit;
  };
  readonly preservedOverlayFields: readonly string[];
  readonly changedStateRefs: readonly string[];
  readonly publicSummary: string;
}

export interface IGmUnitReloadInterventionDomainPayload {
  readonly reload: IGmUnitReloadCommandProjection;
  readonly projectedEffects: readonly IGmUnitReloadProjectedEffect[];
}

export interface IGmUnitReloadPublicEffect extends IGmPublicEffect {
  readonly family: 'unit-reload';
}
