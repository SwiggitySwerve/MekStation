/**
 * SPADesignation — typed discriminated union for the player-supplied
 * designation that travels with a designation-dependent SPA on the pilot
 * record.
 *
 * Wave 1 (`add-spa-picker-component`) shipped a stub `{ kind: string;
 * value: string }` shape. Wave 2a (`add-pilot-spa-editor-integration`)
 * persisted the stub onto the pilot record. This module — Wave 2b
 * (`add-spa-designation-persistence`) — replaces the stub with a real
 * union keyed on the `designationType` slug declared on the canonical
 * SPA definition. Each variant carries the typed payload that the combat
 * layer needs at attack resolution.
 *
 * Storage: the SQLite row keeps the same two columns
 * (`designation_kind` + `designation_value`). `designation_kind` stores
 * the discriminator slug; `designation_value` stores a JSON-encoded
 * payload of the variant's body. The repository helpers
 * (`PilotRepository.helpers.ts`) JSON-encode/decode this column and fall
 * back to the legacy stub shape via `legacyDesignationToTyped` so existing
 * rows keep loading.
 *
 * Runtime validation: zod schema below mirrors the union and is exposed
 * to API routes that accept a designation payload off the wire.
 */

import { z } from 'zod';

import type { SPADesignationType } from '@/types/spa/SPADefinition';

// =============================================================================
// Discriminator slugs
// =============================================================================

/**
 * The canonical designation kinds. These are the slugs the catalog uses
 * for `designationType` — kept aligned with `SPADesignationType` so a
 * catalog entry's declaration maps 1:1 to a variant of `ISPADesignation`.
 */
export const SPA_DESIGNATION_KINDS = [
  'weapon_type',
  'weapon_category',
  'range_bracket',
  'target',
  'terrain',
  'skill',
] as const;

export type SPADesignationKind = (typeof SPA_DESIGNATION_KINDS)[number];

// =============================================================================
// Variant payloads
// =============================================================================

/**
 * Weapon type designation — Weapon Specialist, Sandblaster, Human TRO.
 * Stores the canonical equipment id (lowercase, no spaces) so the combat
 * layer can match against `attacker.weaponType` directly. `displayLabel`
 * is preserved so the UI can render "Weapon Specialist (Medium Laser)"
 * without re-resolving the catalog at render time.
 */
export interface IWeaponTypeDesignation {
  readonly kind: 'weapon_type';
  /** Canonical weapon identifier (e.g. "medium_laser", "ppc"). */
  readonly weaponTypeId: string;
  /** User-facing label captured at purchase time. */
  readonly displayLabel: string;
}

/** Weapon category designation — Gunnery Specialization. */
export type SPAWeaponCategory = 'energy' | 'ballistic' | 'missile' | 'physical';

export interface IWeaponCategoryDesignation {
  readonly kind: 'weapon_category';
  readonly category: SPAWeaponCategory;
  readonly displayLabel: string;
}

/** Range bracket designation — Range Master. */
export type SPARangeBracket = 'short' | 'medium' | 'long' | 'extreme';

export interface IRangeBracketDesignation {
  readonly kind: 'range_bracket';
  readonly bracket: SPARangeBracket;
  readonly displayLabel: string;
}

/**
 * Target designation — Blood Stalker.
 *
 * Phase 5 MVP note: at SPA purchase time the player rarely has a unit id
 * to bind to. We allow the picker to record an empty unit id with a
 * "to be assigned later" placeholder; the unit-card UI assigns the real
 * `targetUnitId` post-purchase. Combat code treats an empty `targetUnitId`
 * as "no designation" and skips the modifier rather than throwing.
 */
export interface ITargetDesignation {
  readonly kind: 'target';
  /** Canonical unit id; empty string when assignment is deferred. */
  readonly targetUnitId: string;
  readonly displayLabel: string;
}

/** Terrain designation — Terrain Master, Environmental Specialist. */
export interface ITerrainDesignation {
  readonly kind: 'terrain';
  /** Canonical terrain slug (e.g. "woods", "vacuum"). */
  readonly terrainTypeId: string;
  readonly displayLabel: string;
}

/**
 * Skill designation — reserved for future ATOW-side uses. The canonical
 * catalog doesn't currently include a skill-designation SPA, but the
 * `SPADesignationType` union already declares the slug, so we expose the
 * variant for completeness.
 */
export interface ISkillDesignation {
  readonly kind: 'skill';
  readonly skillId: string;
  readonly displayLabel: string;
}

// =============================================================================
// Discriminated union
// =============================================================================

/**
 * The typed designation shape persisted on `IPilotAbilityRef.designation`.
 *
 * Discriminator is the `kind` field — exhaustive switches over `kind`
 * narrow the variant. Use `assertNever` from `@/utils/assertNever` (or
 * an inline `kind satisfies never`) when authoring new switches.
 */
export type ISPADesignation =
  | IWeaponTypeDesignation
  | IWeaponCategoryDesignation
  | IRangeBracketDesignation
  | ITargetDesignation
  | ITerrainDesignation
  | ISkillDesignation;

// =============================================================================
// Type guards
// =============================================================================

export function isWeaponTypeDesignation(
  d: ISPADesignation | null | undefined,
): d is IWeaponTypeDesignation {
  return d?.kind === 'weapon_type';
}

export function isWeaponCategoryDesignation(
  d: ISPADesignation | null | undefined,
): d is IWeaponCategoryDesignation {
  return d?.kind === 'weapon_category';
}

export function isRangeBracketDesignation(
  d: ISPADesignation | null | undefined,
): d is IRangeBracketDesignation {
  return d?.kind === 'range_bracket';
}

export function isTargetDesignation(
  d: ISPADesignation | null | undefined,
): d is ITargetDesignation {
  return d?.kind === 'target';
}

export function isTerrainDesignation(
  d: ISPADesignation | null | undefined,
): d is ITerrainDesignation {
  return d?.kind === 'terrain';
}

export function isSkillDesignation(
  d: ISPADesignation | null | undefined,
): d is ISkillDesignation {
  return d?.kind === 'skill';
}

// =============================================================================
// Zod schema (runtime validation)
// =============================================================================

const weaponTypeSchema = z.object({
  kind: z.literal('weapon_type'),
  weaponTypeId: z.string().min(1),
  displayLabel: z.string().min(1),
});

const weaponCategorySchema = z.object({
  kind: z.literal('weapon_category'),
  category: z.enum(['energy', 'ballistic', 'missile', 'physical']),
  displayLabel: z.string().min(1),
});

const rangeBracketSchema = z.object({
  kind: z.literal('range_bracket'),
  bracket: z.enum(['short', 'medium', 'long', 'extreme']),
  displayLabel: z.string().min(1),
});

const targetSchema = z.object({
  kind: z.literal('target'),
  // Empty string is valid — represents "to be assigned later" in the
  // picker MVP. The combat layer treats it as "no designation".
  targetUnitId: z.string(),
  displayLabel: z.string().min(1),
});

const terrainSchema = z.object({
  kind: z.literal('terrain'),
  terrainTypeId: z.string().min(1),
  displayLabel: z.string().min(1),
});

const skillSchema = z.object({
  kind: z.literal('skill'),
  skillId: z.string().min(1),
  displayLabel: z.string().min(1),
});

/** Runtime schema mirroring `ISPADesignation`. */
export const SPA_DESIGNATION_SCHEMA = z.discriminatedUnion('kind', [
  weaponTypeSchema,
  weaponCategorySchema,
  rangeBracketSchema,
  targetSchema,
  terrainSchema,
  skillSchema,
]);

// =============================================================================
// Catalog kind alignment
// =============================================================================

/**
 * Map a catalog `designationType` to the discriminator slug used by
 * `ISPADesignation`. The two enums are intentionally identical today,
 * but funnel through this helper so a future catalog rename only needs
 * one edit.
 */
export function catalogDesignationToKind(
  type: SPADesignationType,
): SPADesignationKind {
  // The catalog enum and our discriminator share the same string set;
  // the cast is checked once here so callers can stay typed.
  return type as SPADesignationKind;
}

// =============================================================================
// Legacy migrator
// =============================================================================

/**
 * Convert the Wave 1/2a stub `{ kind: string; value: string }` shape into
 * a typed `ISPADesignation`. Returns `null` when the shape is unknown so
 * the repository can drop unrecognized rows rather than crash.
 *
 * Rules:
 *   - kind === 'weapon_type'      → wraps `value` as both id and label
 *   - kind === 'weapon_category'  → maps the legacy capitalized string
 *     ("Energy" → "energy") to the typed enum, defaults to 'energy'
 *   - kind === 'range_bracket'    → lowercases and accepts short/medium/
 *     long/extreme; falls back to 'short' on bad input
 *   - kind === 'target'           → preserves `value` as `targetUnitId`
 *   - kind === 'terrain'          → wraps `value` as `terrainTypeId`
 *   - kind === 'skill'            → wraps `value` as `skillId`
 *   - kind === 'unknown'          → returns null (stub default)
 *
 * Used at the repository read boundary so rows persisted with the stub
 * shape come back to callers as the typed union.
 */
export function legacyDesignationToTyped(
  legacy: { readonly kind: string; readonly value: string } | null | undefined,
): ISPADesignation | null {
  if (!legacy || !legacy.kind || legacy.kind === 'unknown') return null;
  const value = (legacy.value ?? '').trim();
  if (value.length === 0) return null;

  switch (legacy.kind) {
    case 'weapon_type':
      return {
        kind: 'weapon_type',
        weaponTypeId: value.toLowerCase().replace(/\s+/g, '_'),
        displayLabel: value,
      };
    case 'weapon_category': {
      const lower = value.toLowerCase();
      const category: SPAWeaponCategory =
        lower === 'ballistic' ||
        lower === 'missile' ||
        lower === 'physical' ||
        lower === 'melee' // legacy alias for 'physical'
          ? lower === 'melee'
            ? 'physical'
            : (lower as SPAWeaponCategory)
          : 'energy';
      return { kind: 'weapon_category', category, displayLabel: value };
    }
    case 'range_bracket': {
      const lower = value.toLowerCase();
      const bracket: SPARangeBracket =
        lower === 'medium' ||
        lower === 'long' ||
        lower === 'extreme' ||
        lower === 'short'
          ? (lower as SPARangeBracket)
          : 'short';
      return { kind: 'range_bracket', bracket, displayLabel: value };
    }
    case 'target':
      return {
        kind: 'target',
        targetUnitId: value,
        displayLabel: value,
      };
    case 'terrain':
      return {
        kind: 'terrain',
        terrainTypeId: value.toLowerCase(),
        displayLabel: value,
      };
    case 'skill':
      return {
        kind: 'skill',
        skillId: value.toLowerCase(),
        displayLabel: value,
      };
    default:
      return null;
  }
}

/**
 * Display label accessor — used by the pilot record sheet and the
 * abilities row to render the "(Medium Laser)" suffix without
 * inspecting the discriminator.
 */
export function getDesignationLabel(d: ISPADesignation): string {
  return d.displayLabel;
}
