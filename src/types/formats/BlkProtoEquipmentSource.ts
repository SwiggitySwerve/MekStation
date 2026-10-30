/** Original entry syntax, not resolved identity or effective mount state. */
export interface IBlkProtoEquipmentSyntax {
  /** Parsed line retained by the BLK reader, not original file bytes. */
  readonly rawEntry: string;
  readonly lookupName?: string;
  /** Explicit declaration; absent is distinct from zero. */
  readonly shots?: number;
  readonly size?: number;
  /** This entry's uppercase (R) prefix, not native rear/facing state. */
  readonly rearPrefix?: boolean;
  readonly errors: readonly string[];
}

/** Provenance retained independently of a mount's current name and location. */
export interface IBlkProtoEquipmentSource extends IBlkProtoEquipmentSyntax {
  readonly blockKey: string;
}
