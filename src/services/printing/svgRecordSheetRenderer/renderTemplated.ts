/**
 * Template-Primary Rendering With Skeleton Fallback.
 *
 * The `renderTemplated` entry point renders a Wave-1 non-mech unit
 * (vehicle / aerospace / protomech) through the canonical mm-data
 * template path: select template → load via `MmDataAssetService` →
 * mount → apply text bindings → lay out pips → serialize.
 *
 * The whole template path is wrapped in `try/catch`. On any failure —
 * asset-load failure, template-parse failure, a missing pip group —
 * it falls back to the family's existing skeleton renderer and returns
 * that SVG, so a degraded environment never yields a blank PDF.
 *
 * As of Wave 2 the infantry and battle-armor families also render
 * through this module — `isTemplatedUnit()` returns `true` for them and
 * `renderTemplated`'s switch gains the two cases. They render through a
 * dedicated small-unit path (`renderViaSmallUnitTemplate`) because their
 * pips are a per-trooper / platoon grid rather than the Wave-1
 * per-location `PipFill` model.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Template-Primary Rendering With Skeleton Fallback)
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Type SVG Renderers — infantry / battle-armor cases)
 */

import type {
  IAerospaceRecordSheetData,
  IBattleArmorRecordSheetData,
  IInfantryRecordSheetData,
  IProtoMechRecordSheetData,
  IVehicleRecordSheetData,
} from '@/types/printing';

import { PaperSize } from '@/types/printing';
import { logger } from '@/utils/logger';

import { bindAerospace } from './aerospace/bindings';
import { selectAerospaceTemplate } from './aerospace/selectTemplate';
import { renderAerospaceSVG } from './aerospaceRenderer';
import { bindBattleArmor } from './battlearmor/bindings';
import { selectBattleArmorTemplate } from './battlearmor/selectTemplate';
import { renderBattleArmorSVG } from './battleArmorRenderer';
import { bindInfantry } from './infantry/bindings';
import { selectInfantryTemplate } from './infantry/selectTemplate';
import { renderInfantrySVG } from './infantryRenderer';
import {
  layoutBattleArmorPipGrid,
  layoutInfantryPlatoonPipGrid,
  layoutPipsInGroup,
} from './pipEngine';
import { bindProtoMech } from './protomech/bindings';
import { selectProtoMechTemplate } from './protomech/selectTemplate';
import { renderProtoMechSVG } from './protoMechRenderer';
import {
  TemplateRecordSheetRenderer,
  type PipFill,
  type TextBindings,
} from './templateRecordSheetRenderer';
import { bindVehicle } from './vehicle/bindings';
import { selectVehicleTemplate } from './vehicle/selectTemplate';
import { renderVehicleSVG } from './vehicleRenderer';

/**
 * The non-mech unit types handled by the templated path — the Wave-1
 * families (vehicle / aerospace / protomech) plus the Wave-2 small-unit
 * families (infantry / battle armor).
 */
export type TemplatedUnitData =
  | IVehicleRecordSheetData
  | IAerospaceRecordSheetData
  | IProtoMechRecordSheetData
  | IInfantryRecordSheetData
  | IBattleArmorRecordSheetData;

/** Paper-size directory segment for the asset path. */
function paperDir(paperSize: PaperSize): 'templates_us' | 'templates_iso' {
  return paperSize === PaperSize.A4 ? 'templates_iso' : 'templates_us';
}

/**
 * Resolve a family `templateKey` to its registered SVG filename.
 *
 * Vehicle and ProtoMech keys match their filenames directly; aerospace
 * keys carry no `_default` suffix (the key is a clean semantic id)
 * while the registered files do — so the suffix is appended here.
 */
function templateFilename(templateKey: string): string {
  if (templateKey.startsWith('fighter_')) {
    return `${templateKey}_default.svg`;
  }
  return `${templateKey}.svg`;
}

/** Build the full `/record-sheets/<dir>/<file>` asset path. */
function templatePath(templateKey: string, paperSize: PaperSize): string {
  return `/record-sheets/${paperDir(paperSize)}/${templateFilename(templateKey)}`;
}

/**
 * The pip applicator handed to `TemplateRecordSheetRenderer.applyPips`:
 * lays out one `PipFill` against its resolved group via the shared
 * pip engine.
 */
function applyPipFill(doc: Document, group: Element, fill: PipFill): void {
  layoutPipsInGroup(doc, group, fill.count, {
    className: fill.className,
    clustered: fill.grouped,
  });
}

/**
 * Render one unit through the canonical template path.
 *
 * Shared across the three families — only the template key, the text
 * bindings, and the pip fills differ per family.
 */
async function renderViaTemplate(
  templateKey: string,
  paperSize: PaperSize,
  bindings: { texts: TextBindings; pips: readonly PipFill[] },
): Promise<string> {
  const renderer = new TemplateRecordSheetRenderer();
  await renderer.loadTemplate(templatePath(templateKey, paperSize));
  // Mount off-screen so geometry / web-font measurement is valid, then
  // gate text measurement on font readiness before binding.
  renderer.mount();
  await renderer.awaitFontsReady();
  renderer.applyBindings(bindings.texts);
  renderer.applyPips(bindings.pips, applyPipFill);
  // getSVGString() unmounts the off-screen container as a side effect.
  return renderer.getSVGString();
}

/**
 * The canonical-template marker attribute.
 *
 * The small-unit render path stamps this attribute on the output SVG
 * root. It is present ONLY on output produced by the canonical template
 * path — the skeleton renderers (`infantryRenderer` / `battleArmorRenderer`)
 * never emit it. The silent-fallback guard test (task 5.5) asserts the
 * marker's presence to prove the template path — not the skeleton
 * fallback — produced a given SVG.
 */
export const CANONICAL_TEMPLATE_MARKER = 'data-template-source';

/** The marker value the canonical small-unit template path stamps. */
export const CANONICAL_TEMPLATE_MARKER_VALUE = 'mm-data-canonical';

/**
 * Render a Wave-2 small-unit family (infantry / battle armor) through
 * the canonical template path.
 *
 * Distinct from `renderViaTemplate` because the small-unit pips are a
 * per-trooper column grid (battle armor) or a single platoon grid
 * (infantry) rather than the Wave-1 per-location `PipFill` model — so
 * the `layoutPips` callback supplied by the caller draws the grid
 * directly against the mounted document.
 *
 * Stamps the `CANONICAL_TEMPLATE_MARKER` attribute on the SVG root so
 * the silent-fallback guard can prove the template path produced the
 * output.
 */
async function renderViaSmallUnitTemplate(
  templateKey: string,
  paperSize: PaperSize,
  texts: TextBindings,
  layoutPips: (doc: Document) => void,
): Promise<string> {
  const renderer = new TemplateRecordSheetRenderer();
  await renderer.loadTemplate(templatePath(templateKey, paperSize));

  // Lay out the small-unit pip grids BEFORE mounting. The grids resolve
  // their `soldier_N` / `pips_N` regions via `document.getElementById`
  // and read geometry from the `<rect>` `x/y/width/height` attributes —
  // no `getBBox()` and so no live DOM required. `mount()` detaches the
  // SVG root from the parsed document, after which `getElementById`
  // would return `null`; running the layout first avoids that hazard.
  layoutPips(renderer.document);

  // Mount off-screen so web-font-aware text measurement is valid, then
  // gate text measurement on font readiness before binding.
  renderer.mount();
  await renderer.awaitFontsReady();
  renderer.applyBindings(texts);

  // Stamp the canonical-template marker so the silent-fallback guard can
  // distinguish template output from skeleton-renderer output.
  renderer.root.setAttribute(
    CANONICAL_TEMPLATE_MARKER,
    CANONICAL_TEMPLATE_MARKER_VALUE,
  );
  // getSVGString() unmounts the off-screen container as a side effect.
  return renderer.getSVGString();
}

/**
 * Render a vehicle unit, template-primary with skeleton fallback.
 */
export async function renderVehicleTemplated(
  data: IVehicleRecordSheetData,
  paperSize: PaperSize = PaperSize.LETTER,
): Promise<string> {
  try {
    const key = selectVehicleTemplate(data);
    return await renderViaTemplate(key, paperSize, bindVehicle(data));
  } catch (error) {
    logger.warn(
      'Templated vehicle render failed — falling back to skeleton renderer',
      { error },
    );
    return renderVehicleSVG(data);
  }
}

/**
 * Render an aerospace / conventional-fighter unit, template-primary
 * with skeleton fallback.
 */
export async function renderAerospaceTemplated(
  data: IAerospaceRecordSheetData,
  paperSize: PaperSize = PaperSize.LETTER,
): Promise<string> {
  try {
    const key = selectAerospaceTemplate(data);
    return await renderViaTemplate(key, paperSize, bindAerospace(data));
  } catch (error) {
    logger.warn(
      'Templated aerospace render failed — falling back to skeleton renderer',
      { error },
    );
    return renderAerospaceSVG(data);
  }
}

/**
 * Render a ProtoMech unit, template-primary with skeleton fallback.
 */
export async function renderProtoMechTemplated(
  data: IProtoMechRecordSheetData,
  paperSize: PaperSize = PaperSize.LETTER,
): Promise<string> {
  try {
    const key = selectProtoMechTemplate(data);
    return await renderViaTemplate(key, paperSize, bindProtoMech(data));
  } catch (error) {
    logger.warn(
      'Templated protomech render failed — falling back to skeleton renderer',
      { error },
    );
    return renderProtoMechSVG(data);
  }
}

/**
 * Render an infantry platoon, template-primary with skeleton fallback.
 *
 * Renders the `conventional_infantry_platoon` per-unit block template,
 * laying out the platoon pip grid sized to the platoon trooper count.
 * On any template failure it returns the existing `infantryRenderer`
 * skeleton output.
 */
export async function renderInfantryTemplated(
  data: IInfantryRecordSheetData,
  paperSize: PaperSize = PaperSize.LETTER,
): Promise<string> {
  try {
    const key = selectInfantryTemplate(data);
    const bindings = bindInfantry(data);
    return await renderViaSmallUnitTemplate(
      key,
      paperSize,
      bindings.texts,
      (doc) => {
        layoutInfantryPlatoonPipGrid(doc, bindings.pipCounts.platoonSize);
      },
    );
  } catch (error) {
    logger.warn(
      'Templated infantry render failed — falling back to skeleton renderer',
      { error },
    );
    return renderInfantrySVG(data);
  }
}

/**
 * Render a Battle Armor squad, template-primary with skeleton fallback.
 *
 * Renders the `battle_armor_squad` per-unit block template, laying out
 * the per-trooper armor pip grid (one cluster per trooper column). On
 * any template failure it returns the existing `battleArmorRenderer`
 * skeleton output.
 */
export async function renderBattleArmorTemplated(
  data: IBattleArmorRecordSheetData,
  paperSize: PaperSize = PaperSize.LETTER,
): Promise<string> {
  try {
    const key = selectBattleArmorTemplate(data);
    const bindings = bindBattleArmor(data);
    return await renderViaSmallUnitTemplate(
      key,
      paperSize,
      bindings.texts,
      (doc) => {
        layoutBattleArmorPipGrid(doc, bindings.pipCounts.troopers);
      },
    );
  } catch (error) {
    logger.warn(
      'Templated battle-armor render failed — falling back to skeleton renderer',
      { error },
    );
    return renderBattleArmorSVG(data);
  }
}

/**
 * Render a non-mech unit through the canonical template path, with
 * per-family skeleton fallback on any failure.
 *
 * Covers the Wave-1 families (vehicle / aerospace / protomech) and the
 * Wave-2 small-unit families (infantry / battle armor).
 */
export async function renderTemplated(
  data: TemplatedUnitData,
  paperSize: PaperSize = PaperSize.LETTER,
): Promise<string> {
  switch (data.unitType) {
    case 'vehicle':
      return renderVehicleTemplated(data, paperSize);
    case 'aerospace':
      return renderAerospaceTemplated(data, paperSize);
    case 'protomech':
      return renderProtoMechTemplated(data, paperSize);
    case 'infantry':
      return renderInfantryTemplated(data, paperSize);
    case 'battlearmor':
      return renderBattleArmorTemplated(data, paperSize);
    default:
      return assertNeverTemplatedVariant(data);
  }
}

/**
 * Whether a non-mech record-sheet payload is a templated family. The
 * dispatch layer uses this to choose `renderTemplated` over the
 * skeleton-only `renderRecordSheetSVG`.
 *
 * As of Wave 2 this covers vehicle / aerospace / protomech (Wave 1) and
 * infantry / battle armor (Wave 2) — every customizer-editable non-mech
 * unit type now renders through the canonical template path.
 *
 * Narrows the payload to `TemplatedUnitData` so callers can hand it
 * straight to `renderTemplated` without a cast.
 */
export function isTemplatedUnit(data: {
  unitType: string;
}): data is TemplatedUnitData {
  return (
    data.unitType === 'vehicle' ||
    data.unitType === 'aerospace' ||
    data.unitType === 'protomech' ||
    data.unitType === 'infantry' ||
    data.unitType === 'battlearmor'
  );
}

function assertNeverTemplatedVariant(data: never): never {
  throw new Error(`Unhandled templated unit type: ${String(data)}`);
}
