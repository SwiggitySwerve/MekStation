/**
 * Shared types for quirk modifiers.
 */

/**
 * Quirk category for catalog organization.
 */
export type QuirkCategory =
  | 'targeting'
  | 'defensive'
  | 'piloting'
  | 'physical'
  | 'initiative'
  | 'combat'
  | 'crit'
  | 'weapon';

/**
 * Combat pipeline a quirk affects.
 */
export type QuirkPipeline =
  | 'to-hit'
  | 'psr'
  | 'initiative'
  | 'physical'
  | 'damage'
  | 'heat'
  | 'crit';

/**
 * Quirk catalog entry.
 */
export interface IQuirkCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly category: QuirkCategory;
  readonly pipelines: readonly QuirkPipeline[];
  readonly combatEffect: string;
  /** Whether this is a positive (+) or negative (-) quirk */
  readonly isPositive: boolean;
}
