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
 * Battle-armor and infantry are NOT Wave-1 families: they are routed
 * to their skeleton renderers by `renderRecordSheetSVG` in
 * `renderer.ts`, never through this module. Keeping them out of here
 * avoids an import cycle (`renderer.ts` imports this module).
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Template-Primary Rendering With Skeleton Fallback)
 */

import type {
  IAerospaceRecordSheetData,
  IProtoMechRecordSheetData,
  IVehicleRecordSheetData,
} from '@/types/printing';

import { PaperSize } from '@/types/printing';
import { logger } from '@/utils/logger';

import { bindAerospace } from './aerospace/bindings';
import { selectAerospaceTemplate } from './aerospace/selectTemplate';
import { renderAerospaceSVG } from './aerospaceRenderer';
import { layoutPipsInGroup } from './pipEngine';
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

/** The Wave-1 non-mech unit types handled by the templated path. */
export type TemplatedUnitData =
  | IVehicleRecordSheetData
  | IAerospaceRecordSheetData
  | IProtoMechRecordSheetData;

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
 * Render a Wave-1 non-mech unit (vehicle / aerospace / protomech)
 * through the canonical template path, with per-family skeleton
 * fallback on any failure.
 *
 * Battle-armor and infantry units must NOT be passed here — they are
 * not Wave-1 families and are routed to their skeleton renderers by
 * `renderRecordSheetSVG`.
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
    default:
      return assertNeverTemplatedVariant(data);
  }
}

/**
 * Whether a non-mech record-sheet payload is a Wave-1 templated family
 * (vehicle / aerospace / protomech). The dispatch layer uses this to
 * choose `renderTemplated` over the skeleton-only `renderRecordSheetSVG`.
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
    data.unitType === 'protomech'
  );
}

function assertNeverTemplatedVariant(data: never): never {
  throw new Error(`Unhandled templated unit type: ${String(data)}`);
}
