/**
 * AttackIntentComposer — shared prop + view types (change
 * `attack-phase-intent-composer`, phase 2, tactical-attack-intent
 * capability, ADR 0002 D5/D6/D7/D9/D10).
 *
 * The composer is the SOLE weapon-attack declaration surface while active
 * (Single Attack Authority): it hosts the Weapon Palette, the Heat & Effect
 * Ledger, the Twist Control, and the Volley Resolver, reading the
 * `attackIntent` store slice + the phase-1 derive layer. Every to-hit /
 * heat / penalty value it renders originates from existing calculators
 * (`buildToHitForecast`, `deriveCombatWeaponRangeOptions`,
 * `src/constants/heat.ts`) — there is NO UI-local attack math in this
 * component tree.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import type {
  IGameSession,
  IHexGrid,
  IUnitGameState,
  IWeaponStatus,
  WeaponFireMode,
} from '@/types/gameplay';

/**
 * The context the composer needs to derive legality, forecasts, and ledger
 * totals. Built at the layout from the same session/unit projections the
 * dock already computes (mirrors `IMovementComposerContext`). Inert
 * (`active: false`) outside the weapon-attack phase; the container renders
 * nothing in that case.
 */
export interface IAttackComposerContext {
  /** `true` when the composer owns weapon-attack composition. */
  readonly active: boolean;
  /** The composing unit's id (`null` when nothing is selected). */
  readonly attackerId: string | null;
  /** The composing unit's runtime state (position, facing, heat). */
  readonly unit: IUnitGameState | null;
  /** The composing unit's weapon statuses (readiness, ammo, ranges, heat). */
  readonly weapons: readonly IWeaponStatus[];
  /** Live session — target states, unit names, sides. */
  readonly session: IGameSession | null;
  /** Hex grid for environment legality + cover derivation. */
  readonly grid: IHexGrid | null;
  /** Attacker gunnery — feeds `buildToHitForecast`. */
  readonly gunnery: number;
  /** Heat dissipation capacity (heat sinks) for the ledger's net heat. */
  readonly heatDissipation: number;
  /** Heat the composed movement already banked this turn. */
  readonly movementHeat: number;
}

/**
 * One Weapon Palette row: the weapon's identity, its current assignment,
 * its forecast against the assigned target, and its toggle legality
 * against the FOCUSED working target (block-at-source with reasons).
 */
export interface IWeaponPaletteRow {
  readonly weaponId: string;
  readonly weaponName: string;
  readonly location: string;
  /** Target this weapon is currently assigned to (null = unassigned). */
  readonly assignedTargetId: string | null;
  readonly assignedTargetName: string | null;
  /** `true` when the assignment is against a non-primary target. */
  readonly isSecondaryAssignment: boolean;
  /** Inline secondary penalty (+1 front arc / +2 other), per D5/D6. */
  readonly secondaryPenalty: number | null;
  /** Final to-hit vs the ASSIGNED target (null when unassigned/blocked). */
  readonly finalToHit: number | null;
  /** 2d6 hit probability 0–100 vs the assigned target. */
  readonly hitProbability: number | null;
  /** `true` when toggling against the focused target is illegal. */
  readonly toggleDisabled: boolean;
  /** Rules-backed reason when blocked at source. */
  readonly toggleDisabledReason?: string;
  /** Current fire mode on the assignment (Direct default). */
  readonly mode: WeaponFireMode;
  /** `true` when the weapon offers a Direct/Indirect mode selector. */
  readonly supportsIndirectMode: boolean;
}

/** Always-visible threshold chip (D10) for the Heat & Effect Ledger. */
export interface IThresholdChip {
  readonly id: 'shutdown' | 'ammo';
  readonly label: string;
  /** `safe` (below threshold), `risk` (roll required), `auto` (certain). */
  readonly state: 'safe' | 'risk' | 'auto';
  /** Player-facing detail, e.g. "TN 6 to avoid" or "below heat 14". */
  readonly detail: string;
}

/** One per-target group line in the Volley Resolver summary. */
export interface IResolverGroupLine {
  readonly targetId: string;
  readonly targetName: string;
  readonly isPrimary: boolean;
  readonly weaponCount: number;
}
