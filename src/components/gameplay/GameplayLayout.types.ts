import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { InteractivePhase } from '@/stores/useGameplayStore';
import type {
  GameSide,
  IGameSession,
  IHexCoordinate,
  IMovementRangeHex,
  IPilotSpaSummary,
  IWeaponStatus,
} from '@/types/gameplay';

export interface GameplayLayoutProps {
  /** Game session data */
  session: IGameSession;
  /** Currently selected unit ID */
  selectedUnitId: string | null;
  /** Callback when unit is selected */
  onUnitSelect: (unitId: string | null) => void;
  /** Callback when action is triggered */
  onAction: (actionId: string) => void;
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
  highlightPath?: readonly IHexCoordinate[];
  hoverMpCost?: number;
  hoverUnreachable?: boolean;
  mpLegend?: {
    readonly active: 'walk' | 'run' | 'jump';
    readonly jumpAvailable: boolean;
  };
  onHexHover?: (hex: IHexCoordinate | null) => void;
  interactiveSession?: InteractiveSession;
  /** Player side controlling this UI (defaults to GameSide.Player). */
  playerSide?: GameSide;
  /** Optional className for styling */
  className?: string;
}
