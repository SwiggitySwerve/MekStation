import type { ReactNode } from 'react';

import type {
  IGameEvent,
  IGameState,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
  MapProjectionMode,
} from '@/types/gameplay';
import type { GameSide } from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import type { MapInteractionState } from './useMapInteraction';

export type MapMovementKind = 'walk' | 'run' | 'jump';

export interface MapMovementPointLegendState {
  readonly active: MapMovementKind;
  readonly jumpAvailable: boolean;
  readonly movementMode?: string;
  readonly walkMP?: number;
  readonly runMP?: number;
  readonly jumpMP?: number;
}

export interface HexMapDisplayProps {
  mapId?: string;
  radius: number;
  tokens: readonly IUnitToken[];
  events?: readonly IGameEvent[];
  selectedHex: IHexCoordinate | null;
  hexTerrain?: readonly IHexTerrain[];
  movementRange?: readonly IMovementRangeHex[];
  attackRange?: readonly IHexCoordinate[];
  targetUnitId?: string | null;
  unitWeapons?: Record<string, readonly IWeaponStatus[]>;
  selectedWeaponIds?: readonly string[];
  combatState?: IGameState | null;
  friendlySide?: GameSide;
  objectives?: Readonly<Record<string, IObjectiveMarker>>;
  highlightPath?: readonly IHexCoordinate[];
  hoverMpCost?: number;
  hoverUnreachable?: boolean;
  mpLegend?: MapMovementPointLegendState;
  onMovementModeSelect?: (mode: MapMovementKind) => void;
  onHexClick?: (hex: IHexCoordinate) => void;
  onHexHover?: (hex: IHexCoordinate | null) => void;
  onTokenClick?: (unitId: string) => void;
  onTokenDoubleClick?: (unitId: string) => void;
  onInteractionReady?: (state: MapInteractionState) => void;
  svgOverlayChildren?: ReactNode;
  overlayChildren?: ReactNode;
  projectionMode?: MapProjectionMode;
  showCoordinates?: boolean;
  className?: string;
}
