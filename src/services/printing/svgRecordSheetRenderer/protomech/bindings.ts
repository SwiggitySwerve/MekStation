/**
 * ProtoMech family — template bindings.
 *
 * Pure function mapping an `IProtoMechRecordSheetData` to the
 * `{ texts, pips }` structure consumed by `TemplateRecordSheetRenderer`.
 * Text targets are keyed against the Phase-0 `PROTOMECH_TEMPLATE_IDS`
 * catalog; pip groups carry a typed `PipCounts` contract covering both
 * armor and internal structure per location.
 *
 * Wave-1 renders one ProtoMech per page (the customizer's single-unit
 * context), so bindings consume the first proto in the point.
 *
 * Internal structure is derived from the canonical Total Warfare
 * ProtoMech IS table by tonnage (mirroring MegaMek `ProtoMek`
 * `headStructure` / `legStructure` / `autoSetInternal`) — the
 * record-sheet data carries only armor, not structure.
 *
 * No I/O, no DOM, no asset access — a deterministic pure function.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters)
 */

import type { IProtoMechRecordSheetData } from '@/types/printing';

import type { PipFill, TextBindings } from '../templateRecordSheetRenderer';

import { PROTOMECH_TEMPLATE_IDS } from '../templateElementIds';

/**
 * Per-location armor + structure pip counts for a ProtoMech.
 *
 * Keys are the canonical template location codes (HD / T / L / LA /
 * RA / MG). Arm entries (LA / RA) are absent for quad ProtoMechs.
 */
export interface ProtoMechPipCounts {
  /** Head armor / structure points. */
  readonly HD: { readonly armor: number; readonly structure: number };
  /** Torso armor / structure points. */
  readonly T: { readonly armor: number; readonly structure: number };
  /** Legs armor / structure points (combined location). */
  readonly L: { readonly armor: number; readonly structure: number };
  /** Left-arm armor / structure points (biped / glider only). */
  readonly LA?: { readonly armor: number; readonly structure: number };
  /** Right-arm armor / structure points (biped / glider only). */
  readonly RA?: { readonly armor: number; readonly structure: number };
  /** Main-gun armor / structure points (when a main gun is equipped). */
  readonly MG?: { readonly armor: number; readonly structure: number };
}

/** The result of binding a ProtoMech to its canonical template. */
export interface ProtoMechBindings {
  /** Text injections keyed by template element ID. */
  readonly texts: TextBindings;
  /** Pip-group fills keyed by template pip-group element ID. */
  readonly pips: readonly PipFill[];
  /** Typed per-location armor + structure counts (the fidelity gate). */
  readonly pipCounts: ProtoMechPipCounts;
}

/**
 * Canonical ProtoMech head internal structure by tonnage.
 * Mirrors MegaMek `ProtoMek.headStructure`.
 */
function headStructure(tonnage: number): number {
  if (tonnage <= 5) return 1;
  if (tonnage <= 9) return 2;
  if (tonnage <= 13) return 3;
  return 4;
}

/**
 * Canonical ProtoMech leg internal structure by tonnage.
 * Mirrors MegaMek `ProtoMek.legStructure` (quad legs are sturdier).
 */
function legStructure(tonnage: number, isQuad: boolean): number {
  if (isQuad) {
    if (tonnage <= 3) return 4;
    if (tonnage <= 5) return 5;
    if (tonnage <= 7) return 8;
    if (tonnage <= 9) return 9;
    if (tonnage <= 11) return 12;
    if (tonnage <= 13) return 13;
    return 14;
  }
  if (tonnage <= 3) return 2;
  if (tonnage <= 5) return 3;
  if (tonnage <= 7) return 4;
  if (tonnage <= 9) return 5;
  if (tonnage <= 11) return 6;
  if (tonnage <= 13) return 7;
  return 8;
}

/**
 * Compute the per-location armor + structure pip counts for a
 * ProtoMech. Armor comes from the first proto's `armorByLocation`;
 * structure is derived from the canonical TW table by tonnage. Arm
 * locations are omitted for quad ProtoMechs.
 *
 * The fidelity gate asserts the rendered pip-element count per
 * location matches these values exactly.
 */
export function computeProtoMechPipCounts(
  data: IProtoMechRecordSheetData,
): ProtoMechPipCounts {
  const proto = data.protos[0];
  const tonnage = data.header.tonnage;
  const isQuad = data.isQuad ?? false;
  const armor = proto?.armorByLocation;

  const headIS = headStructure(tonnage);
  // Torso IS equals tonnage; arm IS equals head IS for bipeds.
  const counts: ProtoMechPipCounts = {
    HD: { armor: armor?.Head?.current ?? 0, structure: headIS },
    T: { armor: armor?.Torso?.current ?? 0, structure: tonnage },
    L: {
      armor: armor?.Legs?.current ?? 0,
      structure: legStructure(tonnage, isQuad),
    },
  };
  const mutable = counts as {
    -readonly [K in keyof ProtoMechPipCounts]: ProtoMechPipCounts[K];
  };

  if (!isQuad) {
    mutable.LA = {
      armor: armor?.['Left Arm']?.current ?? 0,
      structure: headIS,
    };
    mutable.RA = {
      armor: armor?.['Right Arm']?.current ?? 0,
      structure: headIS,
    };
  }

  if (data.mainGun) {
    // Main gun IS: 1 for <=9t, 2 for >9t (MegaMek autoSetInternal).
    mutable.MG = {
      armor: armor?.['Main Gun']?.current ?? 0,
      structure: tonnage > 9 ? 2 : 1,
    };
  }

  return counts;
}

/** Template armor pip-group element ID per location code. */
const ARMOR_PIP_GROUP: Record<string, string> = {
  HD: PROTOMECH_TEMPLATE_IDS.armorPipsHD,
  T: PROTOMECH_TEMPLATE_IDS.armorPipsT,
  L: PROTOMECH_TEMPLATE_IDS.armorPipsL,
  LA: PROTOMECH_TEMPLATE_IDS.armorPipsLA,
  RA: PROTOMECH_TEMPLATE_IDS.armorPipsRA,
  MG: PROTOMECH_TEMPLATE_IDS.armorPipsMG,
};

/** Template structure pip-group element ID per location code. */
const STRUCTURE_PIP_GROUP: Record<string, string> = {
  HD: PROTOMECH_TEMPLATE_IDS.structurePipsHD,
  T: PROTOMECH_TEMPLATE_IDS.structurePipsT,
  L: PROTOMECH_TEMPLATE_IDS.structurePipsL,
  LA: PROTOMECH_TEMPLATE_IDS.structurePipsLA,
  RA: PROTOMECH_TEMPLATE_IDS.structurePipsRA,
  MG: PROTOMECH_TEMPLATE_IDS.structurePipsMG,
};

/**
 * Bind a ProtoMech unit to its canonical template. Produces header /
 * movement text injections and the per-location armor + structure pip
 * fills. Only catalogued template IDs are referenced.
 */
export function bindProtoMech(
  data: IProtoMechRecordSheetData,
): ProtoMechBindings {
  const { header } = data;
  const pipCounts = computeProtoMechPipCounts(data);

  // --- Text bindings (catalogued IDs only) ---
  const texts: Record<string, string> = {
    [PROTOMECH_TEMPLATE_IDS.type]: `${header.chassis} ${header.model}`,
    [PROTOMECH_TEMPLATE_IDS.tonnage]: String(header.tonnage),
    [PROTOMECH_TEMPLATE_IDS.techBase]: header.techBase,
    [PROTOMECH_TEMPLATE_IDS.rulesLevel]: header.rulesLevel,
    [PROTOMECH_TEMPLATE_IDS.role]: header.role ?? '',
    [PROTOMECH_TEMPLATE_IDS.bv]: header.battleValue.toLocaleString(),
    [PROTOMECH_TEMPLATE_IDS.mpWalk]: String(data.walkMP),
    [PROTOMECH_TEMPLATE_IDS.mpJump]: String(data.jumpMP),
  };

  if (data.pilot) {
    texts[PROTOMECH_TEMPLATE_IDS.gunnerySkill0] = String(data.pilot.gunnery);
  }
  if (data.mainGun) {
    texts[PROTOMECH_TEMPLATE_IDS.text_MG] = data.mainGun;
  }

  // --- Pip fills — armor + structure per location ---
  const pips: PipFill[] = [];
  for (const code of Object.keys(pipCounts) as (keyof ProtoMechPipCounts)[]) {
    const entry = pipCounts[code];
    if (!entry) {
      continue;
    }
    const armorGroup = ARMOR_PIP_GROUP[code];
    if (armorGroup && entry.armor > 0) {
      pips.push({
        groupId: armorGroup,
        count: entry.armor,
        className: 'pip armor',
      });
    }
    const structureGroup = STRUCTURE_PIP_GROUP[code];
    if (structureGroup && entry.structure > 0) {
      pips.push({
        groupId: structureGroup,
        count: entry.structure,
        className: 'pip structure',
      });
    }
  }

  return { texts, pips, pipCounts };
}
