/**
 * SVG Record Sheet Renderer
 *
 * Renders record sheets using MegaMek SVG templates.
 * Fills in template placeholders with unit data and loads armor/structure pips.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import {
  IMechRecordSheetData,
  INonMechRecordSheetData,
  PaperSize,
  PREVIEW_DPI_MULTIPLIER,
} from '@/types/printing';

import { renderAerospaceSVG } from './aerospaceRenderer';
import { fillArmorPips } from './armor';
import { renderBattleArmorSVG } from './battleArmorRenderer';
import { ELEMENT_IDS } from './constants';
import { renderCriticalSlots } from './criticals';
import { renderEquipmentTable } from './equipment';
import { renderInfantrySVG } from './infantryRenderer';
import { renderNativeMechSPASection } from './nativeMechSPA';
import { renderProtoMechSVG } from './protoMechRenderer';
import { renderSPASection } from './spaSection';
import { fillStructurePips } from './structure';
import {
  addDocumentMargins,
  hideSecondCrewPanel,
  fixCopyrightYear,
} from './template';
import { TemplateRecordSheetRenderer } from './templateRecordSheetRenderer';
import { renderVehicleSVG } from './vehicleRenderer';

export function renderRecordSheetSVG(data: INonMechRecordSheetData): string {
  switch (data.unitType) {
    case 'vehicle':
      return renderVehicleSVG(data);
    case 'aerospace':
      return renderAerospaceSVG(data);
    case 'battlearmor':
      return renderBattleArmorSVG(data);
    case 'infantry':
      return renderInfantrySVG(data);
    case 'protomech':
      return renderProtoMechSVG(data);
    default:
      return assertNeverRecordSheetVariant(data);
  }
}

function assertNeverRecordSheetVariant(data: never): never {
  throw new Error(`Unhandled record sheet unit type: ${String(data)}`);
}

/**
 * Mech record-sheet renderer.
 *
 * A thin consumer of the shared `TemplateRecordSheetRenderer`: the
 * canonical-template handling (asset load, DOM parse, text injection,
 * serialization, canvas rasterization) lives in the shared core, and
 * this class owns only the mech-specific binding logic (header field
 * mapping, equipment / critical-slot tables, mech armor / structure
 * pips). The refactor is behaviour-preserving — the existing mech
 * `SVGRecordSheetRenderer` tests pin the public surface.
 */
export class SVGRecordSheetRenderer {
  private readonly core = new TemplateRecordSheetRenderer();

  loadTemplate = async (
    templatePath: string,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<void> => {
    await this.core.loadTemplate(templatePath);
    addDocumentMargins(this.core.root, paperSize);
    await this.core.awaitFontsReady();
  };

  fillTemplate = (data: IMechRecordSheetData): void => {
    // `core.document` throws 'Template not loaded' when no template is
    // loaded — preserves the prior guard behaviour.
    const svgDoc = this.core.document;

    this.core.applyBindings({
      [ELEMENT_IDS.TYPE]: `${data.header.chassis} ${data.header.model}`,
      [ELEMENT_IDS.TONNAGE]: String(data.header.tonnage),
      [ELEMENT_IDS.TECH_BASE]: data.header.techBase,
      [ELEMENT_IDS.RULES_LEVEL]: data.header.rulesLevel,
      [ELEMENT_IDS.ROLE]: data.header.role ?? '',
      [ELEMENT_IDS.ENGINE_TYPE]: data.header.engineDescription ?? '',
      [ELEMENT_IDS.WALK_MP]: String(data.movement.walkMP),
      [ELEMENT_IDS.RUN_MP]: String(data.movement.runMP),
      [ELEMENT_IDS.JUMP_MP]: String(data.movement.jumpMP),
      [ELEMENT_IDS.BV]: data.header.battleValue.toLocaleString(),
      [ELEMENT_IDS.ARMOR_TYPE]: data.armor.type,
      [ELEMENT_IDS.STRUCTURE_TYPE]: data.structure.type,
      [ELEMENT_IDS.HEAT_SINK_TYPE]: data.heatSinks.type,
      [ELEMENT_IDS.HEAT_SINK_COUNT]: `${data.heatSinks.count}`,
      [ELEMENT_IDS.PILOT_NAME]: '',
      [ELEMENT_IDS.GUNNERY_SKILL]: '',
      [ELEMENT_IDS.PILOTING_SKILL]: '',
    });

    fixCopyrightYear(svgDoc);
    hideSecondCrewPanel(svgDoc);

    renderEquipmentTable(svgDoc, data.equipment);
    renderCriticalSlots(svgDoc, data.criticals);

    // Phase 5 Wave 3 — render the Special Abilities block when present.
    // Helper skips when there are no resolvable entries.
    if (data.specialAbilities && data.specialAbilities.length > 0) {
      const renderAbilities =
        data.mechType === 'biped'
          ? renderNativeMechSPASection
          : renderSPASection;
      renderAbilities(svgDoc, {
        entries: data.specialAbilities,
        hasContent: true,
      });
    }
  };

  fillArmorPips = async (
    armor: IMechRecordSheetData['armor'],
    mechType?: string,
  ): Promise<void> => {
    await fillArmorPips(this.core.document, this.core.root, armor, mechType);
  };

  fillStructurePips = async (
    structure: IMechRecordSheetData['structure'],
    tonnage: number,
    mechType?: string,
  ): Promise<void> => {
    await fillStructurePips(
      this.core.document,
      this.core.root,
      structure,
      tonnage,
      mechType,
    );
  };

  getSVGString = (): string => {
    return this.core.getSVGString();
  };

  renderToCanvas = async (
    canvas: HTMLCanvasElement,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<void> => {
    await this.renderToCanvasHighDPI(canvas, PREVIEW_DPI_MULTIPLIER, paperSize);
  };

  renderToCanvasHighDPI = async (
    canvas: HTMLCanvasElement,
    dpiMultiplier: number,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<void> => {
    await this.core.renderToCanvas(canvas, dpiMultiplier, paperSize);
  };
}

export async function createSVGRenderer(
  templatePath: string,
): Promise<SVGRecordSheetRenderer> {
  const renderer = new SVGRecordSheetRenderer();
  await renderer.loadTemplate(templatePath);
  return renderer;
}
