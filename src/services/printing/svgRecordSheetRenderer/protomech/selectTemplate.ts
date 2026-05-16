/**
 * ProtoMech family — canonical template selection.
 *
 * Pure function mapping an `IProtoMechRecordSheetData` to a Wave-1
 * `templateKey`, mirroring MegaMekLab `PrintProtoMek.getSVGFileName()`:
 * a quad selects `protomek_quad`, a glider selects `protomek_glider`,
 * everything else selects `protomek_biped`.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters — protomech keys)
 */

import type { IProtoMechRecordSheetData } from '@/types/printing';

/** The three Wave-1 ProtoMech template keys. */
export type ProtoMechTemplateKey =
  | 'protomek_biped'
  | 'protomek_quad'
  | 'protomek_glider';

/**
 * Select the canonical Wave-1 template key for a ProtoMech unit.
 *
 * Branches in `PrintProtoMek` priority order: `isQuad()` first, then
 * `isGlider()`, then biped as the default. A quad-glider is not a
 * valid ProtoMech configuration; quad takes precedence if both flags
 * are somehow set.
 */
export function selectProtoMechTemplate(
  data: IProtoMechRecordSheetData,
): ProtoMechTemplateKey {
  if (data.isQuad) {
    return 'protomek_quad';
  }
  if (data.isGlider) {
    return 'protomek_glider';
  }
  return 'protomek_biped';
}
