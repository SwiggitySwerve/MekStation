import type { IWeapon } from '@/simulation/ai/types';
import type {
  IAttackerState,
  ITargetState,
  RangeBracket,
  WeaponFireMode,
} from '@/types/gameplay';

export interface WeaponSelectorProps {
  /** All weapons mounted on the attacker */
  weapons: readonly IWeapon[];
  /** Distance in hexes from attacker to target */
  rangeToTarget: number;
  /** Projection-derived range bracket. Undefined preserves legacy range inference. */
  activeRangeBracket?: RangeBracket | null;
  /** Currently selected weapon ids */
  selectedWeaponIds: readonly string[];
  /** Resolved or requested per-weapon fire modes for the active attacker. */
  weaponModesByWeaponId?: Readonly<Record<string, WeaponFireMode>>;
  /** Validation message from the last mode toggle attempt. */
  weaponModeError?: string | null;
  /** Ammo remaining per weapon id (-1 = energy / unlimited) */
  ammo: Readonly<Record<string, number>>;
  /** Callback fired when a weapon is toggled */
  onToggle: (weaponId: string) => void;
  /** Callback fired when a weapon fire mode is changed. */
  onModeChange?: (weaponId: string, mode: WeaponFireMode) => void;
  /**
   * Per `add-what-if-to-hit-preview` § 8: attacker/target projections
   * needed to compute `previewAttackOutcome` per weapon. Both must be
   * present (alongside `previewEnabled === true`) for the preview
   * columns to render. Optional so existing call sites that only need
   * the basic checkbox grid don't have to wire them up.
   */
  attacker?: IAttackerState | null;
  target?: ITargetState | null;
  /**
   * Per `add-what-if-to-hit-preview` § 7-8: when `true`, each weapon
   * row renders Exp. Dmg / ± stddev / Crit % columns. Sourced from
   * `useGameplayStore.previewEnabled` by the parent panel.
   */
  previewEnabled?: boolean;
  /**
   * Per `add-what-if-to-hit-preview` § 8.1: header toggle callback.
   * When provided, a "Preview Damage" switch is rendered in the
   * header. Pure UI — flipping it must not append events or mutate
   * the session (the parent wires this to `setPreviewEnabled`).
   */
  onTogglePreview?: (next: boolean) => void;
  /** Optional className */
  className?: string;
}
