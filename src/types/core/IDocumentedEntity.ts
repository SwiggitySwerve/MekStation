/**
 * IDocumentedEntity - Source documentation interface
 * Components with source references SHALL implement IDocumentedEntity.
 *
 * @spec core-entity-types/spec.md
 */

/**
 * Interface for entities with documentation references.
 * Used for tracking official source material.
 */
export interface IDocumentedEntity {
  /**
   * Optional source book reference.
   * E.g., "TechManual", "TRO: 3050"
   */
  readonly sourceBook?: string;

  /**
   * Optional page reference in the source book.
   * Can be a single page number or range like "42" or "42-44"
   */
  readonly pageReference?: string;
}

/**
 * Type guard to check if an object implements IDocumentedEntity
 */
export function isDocumentedEntity(obj: unknown): obj is IDocumentedEntity {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const doc = obj as IDocumentedEntity;

  // Both are optional, so just check if they're the right type when present
  if (doc.sourceBook !== undefined && typeof doc.sourceBook !== 'string') {
    return false;
  }
  if (
    doc.pageReference !== undefined &&
    typeof doc.pageReference !== 'string'
  ) {
    return false;
  }

  return true;
}
