/**
 * The legacy `Ultraheavy` ProtoMech chassis value: one reading rule, one fingerprint rule.
 *
 * MegaMekLab 62bf193 has three motives (BIPED, QUAD, GLIDER) and calls a ProtoMech
 * ultraheavy when its tonnage is above TestProtoMek.MAX_STD_TONNAGE
 * (PMChassisView.java:75-77,205-207). Before 4.1-b3d the editor stored a fourth chassis
 * value, `Ultraheavy`, for a biped of 10 t or more. Drafts and library records saved
 * then still say so, so:
 *   - reading maps the legacy value to the biped it always was (mass is kept as saved);
 *   - fingerprinting projects a biped above 9 t back to the legacy label, so a unit
 *     saved before keeps the exact bytes it was saved with (a reviewed loader shim, see
 *     stores/unitSaveState.rules.md; stored fingerprints are never rewritten).
 *
 * The `ProtoChassis.ULTRAHEAVY` member stays for the replay schema and the source model.
 * Pure: no React or store imports.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { isProtoUltraheavyTonnage } from './mainGun';

/** A saved chassis, read as the motive it is: the legacy Ultraheavy was a biped. */
export function readSavedProtoChassis(chassisType: ProtoChassis): ProtoChassis {
  return chassisType === ProtoChassis.ULTRAHEAVY
    ? ProtoChassis.BIPED
    : chassisType;
}

/**
 * The chassis label the code before 4.1-b3d fingerprinted: a biped above 9 t was
 * `Ultraheavy`. Quads and gliders were never relabelled.
 */
export function legacyProtoChassisLabel(
  chassisType: ProtoChassis,
  tonnage: number,
): ProtoChassis {
  return chassisType === ProtoChassis.BIPED && isProtoUltraheavyTonnage(tonnage)
    ? ProtoChassis.ULTRAHEAVY
    : chassisType;
}
