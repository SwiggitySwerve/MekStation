import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackDeclaredPayload } from '@/types/gameplay/GameSessionAttackEvents';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type { WeaponFireMode } from '@/types/gameplay/IndirectFireInterfaces';

/**
 * Inputs for `applyInteractiveSessionAttack` — the live session and the
 * cached per-unit weapon map.
 *
 * Wave 8 PR-K5: `grid` and `targetHex` are OPTIONAL fields. When `grid`
 * is supplied, `applyInteractiveSessionAttack` pre-computes the
 * indirect-fire resolution per weapon and threads the first
 * `permitted && isIndirect` result into `declareAttack` (the engine path
 * established by PR-K + PR-K4). When omitted, the function behaves
 * identically to its pre-K5 contract — no resolution computed, no
 * indirect-fire events emitted.
 */
export interface IApplyAttackInput {
  readonly session: IGameSession;
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponIds: readonly string[];
  /** Optional requested per-weapon fire modes; invalid Indirect modes resolve to Direct. */
  readonly weaponModesByWeaponId?: Readonly<Record<string, WeaponFireMode>>;
  /** Optional defender-selected AMS mount id keyed by incoming weapon id. */
  readonly selectedAMSWeaponIds?: IAttackDeclaredPayload['selectedAMSWeaponIds'];
  /** Optional called-shot intent keyed by weapon id. */
  readonly calledShots?: Readonly<Record<string, boolean>>;
  /** Optional teammate-assisted called-shot intent keyed by weapon id. */
  readonly teammateCalledShots?: Readonly<Record<string, boolean>>;
  /** Wave 8 PR-K5: optional grid for indirect-fire LOS + spotter election. */
  readonly grid?: IHexGrid;
  /** Optional unit-id to canonical pilot SPA ids map for indirect-fire SPAs. */
  readonly pilotSpasByUnitId?: Readonly<Record<string, readonly string[]>>;
  /**
   * Wave 8 PR-K5: optional override of the target hex carried on the
   * indirect-fire event payloads. Defaults to the target unit's live
   * position when omitted.
   */
  readonly targetHex?: IHexCoordinate;
}
