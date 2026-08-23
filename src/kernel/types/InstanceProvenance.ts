/**
 * Enrolled copy of a library item. Mutations never write the library
 * blob. `sourceVersion` pins which published version was enrolled.
 */
export interface IInstanceProvenance {
  readonly instanceId: string;
  readonly libraryItemId: string;
  readonly sourceVersion: number;
  /** Plugin-defined instance kind (e.g. card-in-play). */
  readonly kind: string;
}
