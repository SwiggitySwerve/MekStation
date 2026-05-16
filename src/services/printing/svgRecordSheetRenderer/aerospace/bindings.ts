/**
 * Aerospace / conventional-fighter family — template bindings.
 *
 * Pure function mapping an `IAerospaceRecordSheetData` to the
 * `{ texts, pips }` structure consumed by `TemplateRecordSheetRenderer`.
 * Text targets are keyed against the Phase-0 `AEROSPACE_TEMPLATE_IDS`
 * catalog; pip groups carry a typed `PipCounts` contract for the four
 * standard armor arcs.
 *
 * No I/O, no DOM, no asset access — a deterministic pure function.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters)
 */

import type { IAerospaceRecordSheetData } from '@/types/printing';

import type { PipFill, TextBindings } from '../templateRecordSheetRenderer';

import { AEROSPACE_TEMPLATE_IDS } from '../templateElementIds';

/**
 * Per-arc armor pip counts for an aerospace / conventional fighter.
 *
 * Keys are the canonical template arc codes (NOS / LWG / RWG / AFT).
 */
export interface AerospacePipCounts {
  /** Nose-arc armor points. */
  readonly NOS: number;
  /** Left-wing-arc armor points. */
  readonly LWG: number;
  /** Right-wing-arc armor points. */
  readonly RWG: number;
  /** Aft-arc armor points. */
  readonly AFT: number;
}

/** The result of binding an aerospace unit to its canonical template. */
export interface AerospaceBindings {
  /** Text injections keyed by template element ID. */
  readonly texts: TextBindings;
  /** Pip-group fills keyed by template pip-group element ID. */
  readonly pips: readonly PipFill[];
  /** Typed per-arc pip counts (the fidelity-gate contract). */
  readonly pipCounts: AerospacePipCounts;
}

/** Map an `IAerospaceArcArmor.arc` string to the template arc code. */
const ARC_TO_CODE: Record<string, keyof AerospacePipCounts> = {
  Nose: 'NOS',
  'Left Wing': 'LWG',
  'Right Wing': 'RWG',
  Aft: 'AFT',
};

/** Template armor pip-group element ID per arc code. */
const ARMOR_PIP_GROUP: Record<keyof AerospacePipCounts, string> = {
  NOS: AEROSPACE_TEMPLATE_IDS.armorPipsNOS,
  LWG: AEROSPACE_TEMPLATE_IDS.armorPipsLWG,
  RWG: AEROSPACE_TEMPLATE_IDS.armorPipsRWG,
  AFT: AEROSPACE_TEMPLATE_IDS.armorPipsAFT,
};

/** Template armor value-text element ID per arc code. */
const ARMOR_TEXT: Record<keyof AerospacePipCounts, string> = {
  NOS: AEROSPACE_TEMPLATE_IDS.textArmor_NOS,
  LWG: AEROSPACE_TEMPLATE_IDS.textArmor_LWG,
  RWG: AEROSPACE_TEMPLATE_IDS.textArmor_RWG,
  AFT: AEROSPACE_TEMPLATE_IDS.textArmor_AFT,
};

/**
 * Compute the per-arc armor pip counts for an aerospace fighter.
 *
 * Each count equals the unit's `current` armor value for that arc —
 * the fidelity gate asserts the rendered pip-element count per arc
 * matches this exactly. Arcs absent from the unit data default to 0.
 */
export function computeAerospacePipCounts(
  data: IAerospaceRecordSheetData,
): AerospacePipCounts {
  const counts: AerospacePipCounts = { NOS: 0, LWG: 0, RWG: 0, AFT: 0 };
  const mutable = counts as {
    -readonly [K in keyof AerospacePipCounts]: number;
  };
  for (const arc of data.armorArcs) {
    const code = ARC_TO_CODE[arc.arc];
    if (code) {
      mutable[code] = arc.current;
    }
  }
  return counts;
}

/**
 * Bind an aerospace / conventional-fighter unit to its canonical
 * template. Produces header / thrust / heat text injections, the
 * Structural Integrity text, and the four armor-arc pip fills.
 */
export function bindAerospace(
  data: IAerospaceRecordSheetData,
): AerospaceBindings {
  const { header } = data;
  const pipCounts = computeAerospacePipCounts(data);

  // --- Text bindings (catalogued IDs only) ---
  const texts: Record<string, string> = {
    [AEROSPACE_TEMPLATE_IDS.type]: `${header.chassis} ${header.model}`,
    [AEROSPACE_TEMPLATE_IDS.tonnage]: String(header.tonnage),
    [AEROSPACE_TEMPLATE_IDS.techBase]: header.techBase,
    [AEROSPACE_TEMPLATE_IDS.rulesLevel]: header.rulesLevel,
    [AEROSPACE_TEMPLATE_IDS.role]: header.role ?? '',
    [AEROSPACE_TEMPLATE_IDS.bv]: header.battleValue.toLocaleString(),
    [AEROSPACE_TEMPLATE_IDS.armorType]: data.armorType,
    [AEROSPACE_TEMPLATE_IDS.mpWalk]: String(data.safeThrust),
    [AEROSPACE_TEMPLATE_IDS.mpRun]: String(data.maxThrust),
    [AEROSPACE_TEMPLATE_IDS.textSI]: String(data.structuralIntegrity),
    [AEROSPACE_TEMPLATE_IDS.hsType]: data.heatSinks.type,
    [AEROSPACE_TEMPLATE_IDS.hsCount]: String(data.heatSinks.count),
  };

  // Pilot skills, when present.
  if (data.pilot) {
    texts[AEROSPACE_TEMPLATE_IDS.gunnerySkill0] = String(data.pilot.gunnery);
    texts[AEROSPACE_TEMPLATE_IDS.pilotingSkill0] = String(data.pilot.piloting);
  }

  // Armor value-text labels per arc.
  for (const code of Object.keys(pipCounts) as (keyof AerospacePipCounts)[]) {
    texts[ARMOR_TEXT[code]] = String(pipCounts[code]);
  }

  // --- Pip fills — one per armed arc ---
  const pips: PipFill[] = [];
  for (const code of Object.keys(pipCounts) as (keyof AerospacePipCounts)[]) {
    const count = pipCounts[code];
    if (count > 0) {
      pips.push({
        groupId: ARMOR_PIP_GROUP[code],
        count,
        className: 'pip armor',
      });
    }
  }

  return { texts, pips, pipCounts };
}
