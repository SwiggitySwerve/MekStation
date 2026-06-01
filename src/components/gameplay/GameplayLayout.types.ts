import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type { PhysicalAttackIntent } from '@/components/gameplay/PhysicalAttackPanel';
import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { InteractivePhase } from '@/stores/useGameplayStore';
import type {
  GameSide,
  IGameSession,
  IHexCoordinate,
  IMovementRangeHex,
  IPilotSpaSummary,
  TacticalActionHandler,
  IWeaponStatus,
} from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

export interface GameplayLayoutProps {
  /** Game session data */
  session: IGameSession;
  /** Currently selected unit ID */
  selectedUnitId: string | null;
  /** Callback when unit is selected */
  onUnitSelect: (unitId: string | null) => void;
  /** Callback when action is triggered */
  onAction: TacticalActionHandler;
  /** Callback when hex is clicked */
  onHexClick?: (hex: { q: number; r: number }) => void;
  /** Can the player undo? */
  canUndo?: boolean;
  /** Is it the player's turn? */
  isPlayerTurn?: boolean;
  /** Unit weapon data for record sheet */
  unitWeapons?: Record<string, readonly IWeaponStatus[]>;
  /** Max armor values per unit */
  maxArmor?: Record<string, Record<string, number>>;
  /** Max structure values per unit */
  maxStructure?: Record<string, Record<string, number>>;
  /** Pilot names per unit */
  pilotNames?: Record<string, string>;
  /** Heat sinks per unit */
  heatSinks?: Record<string, number>;
  /**
   * Per `add-interactive-combat-core-ui` § 8: SPA projection per
   * unit. Keyed by unit id → list of SPA summaries. Missing key is
   * treated as an empty list (renders "No SPAs" placeholder).
   */
  unitSpas?: Record<string, readonly IPilotSpaSummary[]>;
  /** Interactive mode phase (if in interactive mode) */
  interactivePhase?: InteractivePhase;
  /** Hit chance for current attack setup */
  hitChance?: number | null;
  /** Valid target unit IDs */
  validTargetIds?: readonly string[];
  /** Movement range hexes for map display */
  movementRange?: readonly IMovementRangeHex[];
  hoveredHex?: IHexCoordinate | null;
  hoverMovementInfo?: IMovementRangeHex;
  highlightPath?: readonly IHexCoordinate[];
  hoverMpCost?: number;
  hoverUnreachable?: boolean;
  mpLegend?: MapMovementPointLegendState;
  onMovementModeSelect?: (mode: MapMovementKind) => void;
  onHexHover?: (hex: IHexCoordinate | null) => void;
  interactiveSession?: InteractiveSession;
  physicalAttackIntent?: PhysicalAttackIntent | null;
  /** Player side controlling this UI (defaults to GameSide.Player). */
  playerSide?: GameSide;
  /**
   * Tactical command shell rendering mode (Wave 7.1 PR-C).
   *
   * Default 'combat' for live play; pass 'replay' from the replay route,
   * 'gm' for referee mode. Spectator mode renders through `SpectatorView`,
   * not this layout. Shell mode flows into `TacticalCommandShell` and
   * drives mode-aware slot owner selection.
   */
  shellMode?: ShellMode;
  /** Optional className for styling */
  className?: string;
}
