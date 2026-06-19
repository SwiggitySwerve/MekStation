/**
 * Record Sheet Service
 *
 * Orchestrates record sheet generation, preview rendering, and PDF export.
 * Dispatches on `unit.type` / `data.unitType` to per-type extractors and
 * renderers for all six supported unit classes.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import type { IPilotAbilityRef } from '@/types/pilot';

import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import {
  IRecordSheetData,
  IMechRecordSheetData,
  INonMechRecordSheetData,
  PaperSize,
  PAPER_DIMENSIONS,
  PDF_DPI_MULTIPLIER,
  IPDFExportOptions,
} from '@/types/printing';

import { SVG_TEMPLATES, SVG_TEMPLATES_A4 } from './recordsheet/constants';
import {
  extractHeader,
  extractMovement,
  extractArmor,
  extractStructure,
  extractEquipment,
  extractHeatSinks,
  extractCriticals,
} from './recordsheet/dataExtractors';
import { extractAerospaceData } from './recordsheet/dataExtractors.aerospace';
import { extractBattleArmorData } from './recordsheet/dataExtractors.battleArmor';
import { extractInfantryData } from './recordsheet/dataExtractors.infantry';
import { extractProtoMechData } from './recordsheet/dataExtractors.protoMech';
import { extractVehicleData } from './recordsheet/dataExtractors.vehicle';
import {
  dispatchTargetFromUnit,
  isRecordSheetDispatchTarget,
  type IRecordSheetDispatchTarget,
  type IRecordSheetUnitInput,
} from './recordsheet/dispatchTarget';
import { getMechType } from './recordsheet/mechTypeUtils';
import { buildSPASection } from './recordsheet/spaSection';
import { IUnitConfig } from './recordsheet/types';
import { SVGRecordSheetRenderer } from './svgRecordSheetRenderer';
import { renderToCanvasHighDPI } from './svgRecordSheetRenderer/canvas';
import { renderRecordSheetSVG } from './svgRecordSheetRenderer/renderer';
import {
  isTemplatedUnit,
  renderTemplated,
} from './svgRecordSheetRenderer/renderTemplated';

export type { IUnitConfig };

/**
 * Render a non-mech SVG string to a canvas using the shared high-DPI helper.
 */
async function renderSVGStringToCanvas(
  svgString: string,
  canvas: HTMLCanvasElement,
  dpiMultiplier: number,
): Promise<void> {
  await renderToCanvasHighDPI(svgString, canvas, dpiMultiplier);
}

/**
 * Lazily import the `jsPDF` constructor.
 *
 * jsPDF is a heavyweight client bundle (~280 KB minified). Loading it eagerly
 * pulls it into the main app chunk even for users who never export a PDF.
 * Resolving it via `await import('jspdf')` lets Webpack split it into its own
 * async chunk that's only fetched on first PDF export.
 */
async function getJsPDFConstructor(): Promise<typeof import('jspdf').jsPDF> {
  const { jsPDF } = await import('jspdf');
  return jsPDF;
}

type ExtractRecordSheetData = {
  (
    unit: IUnitConfig,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IMechRecordSheetData;
  (
    target: IRecordSheetDispatchTarget,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IRecordSheetData;
  (
    unit: IRecordSheetUnitInput,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IRecordSheetData;
};

type ExtractRecordSheetDataByType = {
  (
    target: IRecordSheetDispatchTarget,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IRecordSheetData;
  (
    unit: IRecordSheetUnitInput,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IRecordSheetData;
};

/**
 * Record Sheet Service class
 *
 * All public methods accept the discriminated-union `IRecordSheetData` so
 * callers work with the narrowed type they already have. Methods that
 * previously accepted `IMechRecordSheetData` retain that overload for
 * backward compatibility.
 */
export class RecordSheetService {
  // ── Data extraction ──────────────────────────────────────────────────────

  /**
   * Extract record sheet data for any supported unit type.
   *
   * Legacy mech callers without a type hint continue to get the mech payload.
   * New callers can pass either `{ type: 'vehicle' }` style unit configs or an
   * explicit `IRecordSheetDispatchTarget`.
   */
  extractData: ExtractRecordSheetData = ((
    targetOrUnit: IRecordSheetDispatchTarget | IRecordSheetUnitInput,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IRecordSheetData => {
    const target = isRecordSheetDispatchTarget(targetOrUnit)
      ? targetOrUnit
      : dispatchTargetFromUnit(targetOrUnit);

    const spaBlock = pilotAbilities
      ? buildSPASection(pilotAbilities)
      : { entries: [], hasContent: false };
    const specialAbilities = spaBlock.hasContent ? spaBlock.entries : undefined;

    switch (target.kind) {
      case 'mech':
        return this.extractMechData(target.unit, pilotAbilities);
      case 'vehicle':
        return extractVehicleData(target.unit, specialAbilities);
      case 'aerospace':
        return extractAerospaceData(target.unit, specialAbilities);
      case 'battlearmor':
        return extractBattleArmorData(target.unit, specialAbilities);
      case 'infantry':
        return extractInfantryData(target.unit, specialAbilities);
      case 'protomech':
        return extractProtoMechData(target.unit);
      default: {
        return this.assertUnsupportedTarget(target);
      }
    }
  }) as ExtractRecordSheetData;

  /**
   * Backward-compatible alias retained for callers introduced during early
   * Wave 2 scaffolding. Prefer `extractData`.
   */
  extractDataByType: ExtractRecordSheetDataByType = ((
    targetOrUnit: IRecordSheetDispatchTarget | IRecordSheetUnitInput,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IRecordSheetData => {
    if (isRecordSheetDispatchTarget(targetOrUnit)) {
      return this.extractData(targetOrUnit, pilotAbilities);
    }
    return this.extractData(targetOrUnit, pilotAbilities);
  }) as ExtractRecordSheetDataByType;

  private assertUnsupportedTarget(target: never): never {
    throw new Error(`Unhandled record sheet target: ${String(target)}`);
  }

  /**
   * Extract mech-specific record sheet data.
   */
  private extractMechData(
    unit: IUnitConfig,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IMechRecordSheetData {
    const spaBlock = pilotAbilities
      ? buildSPASection(pilotAbilities)
      : { entries: [], hasContent: false };

    return {
      unitType: 'mech',
      header: extractHeader(unit),
      movement: extractMovement(unit),
      armor: extractArmor(unit),
      structure: extractStructure(unit),
      equipment: extractEquipment(unit),
      heatSinks: extractHeatSinks(unit),
      criticals: extractCriticals(unit),
      pilot: undefined,
      specialAbilities: spaBlock.hasContent ? spaBlock.entries : undefined,
      mechType: getMechType(unit.configuration),
    };
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  /**
   * Render a preview of any unit type to a canvas.
   *
   * Mechs use the MegaMek SVG template pipeline; all other types use the
   * per-type string-based SVG renderer rendered via the canvas helper.
   */
  renderPreview = async (
    canvas: HTMLCanvasElement,
    data: IRecordSheetData,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<void> => {
    if (data.unitType === 'mech') {
      await this.renderMechPreview(canvas, data, paperSize);
      return;
    }
    const svgString = await this.buildNonMechSVG(data, paperSize);
    await renderSVGStringToCanvas(svgString, canvas, 1);
  };

  /**
   * Return the SVG string for any unit type.
   *
   * Mechs go through the MegaMek template pipeline; others use the per-type
   * string renderers.
   */
  getSVGString = async (
    data: IRecordSheetData,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<string> => {
    if (data.unitType === 'mech') {
      return this.getMechSVGString(data, paperSize);
    }
    return this.buildNonMechSVG(data, paperSize);
  };

  /**
   * Export to PDF and trigger a browser download.
   *
   * For non-mech units the per-type SVG is rasterised to canvas then embedded
   * in the PDF at letter / A4 dimensions.
   */
  exportPDF = async (
    data: IRecordSheetData,
    options: IPDFExportOptions = {
      paperSize: PaperSize.LETTER,
      includePilotData: false,
    },
  ): Promise<void> => {
    const { paperSize, filename } = options;
    const { width, height } = PAPER_DIMENSIONS[paperSize];

    if (data.unitType === 'mech') {
      await this.exportMechPDF(data, options);
      return;
    }

    // Non-mech: render SVG string → canvas → PDF
    const canvas = document.createElement('canvas');
    const scaledWidth = width * PDF_DPI_MULTIPLIER;
    const scaledHeight = height * PDF_DPI_MULTIPLIER;
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    const svgString = await this.buildNonMechSVG(data, paperSize);
    await renderSVGStringToCanvas(svgString, canvas, PDF_DPI_MULTIPLIER);

    const PDF = await getJsPDFConstructor();
    const pdf = new PDF({
      orientation: 'portrait',
      unit: 'pt',
      format: paperSize === PaperSize.A4 ? 'a4' : 'letter',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);

    const pdfFilename =
      filename ||
      `${data.header.chassis}-${data.header.model}.pdf`.replace(/\s+/g, '-');
    pdf.save(pdfFilename);
  };

  // ── Internal mech helpers (preserve existing behaviour exactly) ───────────

  private async renderMechPreview(
    canvas: HTMLCanvasElement,
    data: IMechRecordSheetData,
    paperSize: PaperSize,
  ): Promise<void> {
    const templates =
      paperSize === PaperSize.A4 ? SVG_TEMPLATES_A4 : SVG_TEMPLATES;
    const templatePath = templates[data.mechType] || templates.biped;

    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate(templatePath);
    renderer.fillTemplate(data);
    await renderer.fillArmorPips(data.armor, data.mechType);
    await renderer.fillStructurePips(
      data.structure,
      data.header.tonnage,
      data.mechType,
    );
    await renderer.renderToCanvas(canvas);
  }

  private async getMechSVGString(
    data: IMechRecordSheetData,
    paperSize: PaperSize,
  ): Promise<string> {
    const templates =
      paperSize === PaperSize.A4 ? SVG_TEMPLATES_A4 : SVG_TEMPLATES;
    const templatePath = templates[data.mechType] || templates.biped;

    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate(templatePath);
    renderer.fillTemplate(data);
    await renderer.fillArmorPips(data.armor, data.mechType);
    await renderer.fillStructurePips(
      data.structure,
      data.header.tonnage,
      data.mechType,
    );
    return renderer.getSVGString();
  }

  private async exportMechPDF(
    data: IMechRecordSheetData,
    options: IPDFExportOptions,
  ): Promise<void> {
    const { paperSize, filename } = options;
    const { width, height } = PAPER_DIMENSIONS[paperSize];

    const canvas = document.createElement('canvas');
    const scaledWidth = width * PDF_DPI_MULTIPLIER;
    const scaledHeight = height * PDF_DPI_MULTIPLIER;
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    const templates =
      paperSize === PaperSize.A4 ? SVG_TEMPLATES_A4 : SVG_TEMPLATES;
    const templatePath = templates[data.mechType] || templates.biped;

    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate(templatePath);
    renderer.fillTemplate(data);
    await renderer.fillArmorPips(data.armor, data.mechType);
    await renderer.fillStructurePips(
      data.structure,
      data.header.tonnage,
      data.mechType,
    );
    await renderer.renderToCanvasHighDPI(canvas, PDF_DPI_MULTIPLIER);

    const PDF = await getJsPDFConstructor();
    const pdf = new PDF({
      orientation: 'portrait',
      unit: 'pt',
      format: paperSize === PaperSize.A4 ? 'a4' : 'letter',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);

    const pdfFilename =
      filename ||
      `${data.header.chassis}-${data.header.model}.pdf`.replace(/\s+/g, '-');
    pdf.save(pdfFilename);
  }

  /**
   * Build an SVG string for any non-mech unit type.
   *
   * Every customizer-editable non-mech family — vehicle / aerospace /
   * protomech (Wave 1) and infantry / battle armor (Wave 2) — renders
   * through the canonical mm-data template path (`renderTemplated`),
   * which falls back to the family skeleton renderer on any failure.
   * `renderRecordSheetSVG` remains the skeleton-only path used by the
   * fallback and by any unit type not yet templated.
   */
  private async buildNonMechSVG(
    data: INonMechRecordSheetData,
    paperSize: PaperSize,
  ): Promise<string> {
    if (isTemplatedUnit(data)) {
      return renderTemplated(data, paperSize);
    }
    return renderRecordSheetSVG(data);
  }

  // ── Print helper (unchanged) ─────────────────────────────────────────────

  /**
   * Print record sheet using browser print dialog.
   */
  print = (canvas: HTMLCanvasElement): void => {
    const dataUrl = canvas.toDataURL('image/png');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error(
        'Could not open print window. Check popup blocker settings.',
      );
    }

    const windowDoc = (printWindow as { document?: Document }).document;
    if (!windowDoc) {
      throw new Error('Print window does not have document access');
    }

    windowDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Record Sheet</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; display: flex; justify-content: center; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { margin: 0; }
              img { max-width: 100%; max-height: 100vh; }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    windowDoc.close();
  };
}

const recordSheetServiceFactory: SingletonFactory<RecordSheetService> =
  createSingleton((): RecordSheetService => new RecordSheetService());

export function getRecordSheetService(): RecordSheetService {
  return recordSheetServiceFactory.get();
}

export function resetRecordSheetService(): void {
  recordSheetServiceFactory.reset();
}
