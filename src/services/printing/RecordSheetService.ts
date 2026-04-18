/**
 * Record Sheet Service
 *
 * Orchestrates record sheet generation, preview rendering, and PDF export.
 * Dispatches on `unit.type` / `data.unitType` to per-type extractors and
 * renderers for all six supported unit classes.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import { jsPDF } from "jspdf";

import type { IPilotAbilityRef } from "@/types/pilot";

import {
  createSingleton,
  type SingletonFactory,
} from "@/services/core/createSingleton";
import {
  IRecordSheetData,
  IMechRecordSheetData,
  UnsupportedUnitTypeError,
  PaperSize,
  PAPER_DIMENSIONS,
  PDF_DPI_MULTIPLIER,
  IPDFExportOptions,
} from "@/types/printing";

import { SVG_TEMPLATES, SVG_TEMPLATES_A4 } from "./recordsheet/constants";
import {
  extractHeader,
  extractMovement,
  extractArmor,
  extractStructure,
  extractEquipment,
  extractHeatSinks,
  extractCriticals,
} from "./recordsheet/dataExtractors";
import {
  extractVehicleData,
  type IVehicleUnitConfig,
} from "./recordsheet/dataExtractors.vehicle";
import {
  extractAerospaceData,
  type IAerospaceUnitConfig,
} from "./recordsheet/dataExtractors.aerospace";
import {
  extractBattleArmorData,
  type IBattleArmorUnitConfig,
} from "./recordsheet/dataExtractors.battleArmor";
import {
  extractInfantryData,
  type IInfantryUnitConfig,
} from "./recordsheet/dataExtractors.infantry";
import {
  extractProtoMechData,
  type IProtoMechUnitConfig,
} from "./recordsheet/dataExtractors.protoMech";
import { getMechType } from "./recordsheet/mechTypeUtils";
import { buildSPASection } from "./recordsheet/spaSection";
import { IUnitConfig } from "./recordsheet/types";
import { SVGRecordSheetRenderer } from "./svgRecordSheetRenderer";
import { renderVehicleSVG } from "./svgRecordSheetRenderer/vehicleRenderer";
import { renderAerospaceSVG } from "./svgRecordSheetRenderer/aerospaceRenderer";
import { renderBattleArmorSVG } from "./svgRecordSheetRenderer/battleArmorRenderer";
import { renderInfantrySVG } from "./svgRecordSheetRenderer/infantryRenderer";
import { renderProtoMechSVG } from "./svgRecordSheetRenderer/protoMechRenderer";
import { renderToCanvasHighDPI } from "./svgRecordSheetRenderer/canvas";

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
   * Extract mech record sheet data from a mech unit configuration.
   *
   * Legacy entry-point — always returns `IMechRecordSheetData`. For multi-type
   * dispatch use `extractDataByType`.
   *
   * Phase 5 Wave 3: supply `pilotAbilities` to include the SPA block.
   */
  extractData(
    unit: IUnitConfig,
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IMechRecordSheetData {
    return this.extractMechData(unit, pilotAbilities);
  }

  /**
   * Extract record sheet data dispatching on `unit.type`.
   *
   * Returns the appropriate `IRecordSheetData` variant. Throws
   * `UnsupportedUnitTypeError` for unknown unit types.
   */
  extractDataByType(
    unit: IUnitConfig & { type?: string },
    pilotAbilities?: readonly IPilotAbilityRef[],
  ): IRecordSheetData {
    const unitType = unit.type ?? "mech";
    switch (unitType) {
      case "mech":
        return this.extractMechData(unit, pilotAbilities);
      case "vehicle":
        return extractVehicleData(unit as unknown as IVehicleUnitConfig);
      case "aerospace":
        return extractAerospaceData(unit as unknown as IAerospaceUnitConfig);
      case "battlearmor":
        return extractBattleArmorData(
          unit as unknown as IBattleArmorUnitConfig,
        );
      case "infantry":
        return extractInfantryData(unit as unknown as IInfantryUnitConfig);
      case "protomech":
        return extractProtoMechData(unit as unknown as IProtoMechUnitConfig);
      default:
        throw new UnsupportedUnitTypeError(unitType);
    }
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
      unitType: "mech",
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
  async renderPreview(
    canvas: HTMLCanvasElement,
    data: IRecordSheetData,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<void> {
    if (data.unitType === "mech") {
      await this.renderMechPreview(canvas, data, paperSize);
      return;
    }
    const svgString = this.buildNonMechSVG(data);
    await renderSVGStringToCanvas(svgString, canvas, 1);
  }

  /**
   * Return the SVG string for any unit type.
   *
   * Mechs go through the MegaMek template pipeline; others use the per-type
   * string renderers.
   */
  async getSVGString(
    data: IRecordSheetData,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<string> {
    if (data.unitType === "mech") {
      return this.getMechSVGString(data, paperSize);
    }
    return this.buildNonMechSVG(data);
  }

  /**
   * Export to PDF and trigger a browser download.
   *
   * For non-mech units the per-type SVG is rasterised to canvas then embedded
   * in the PDF at letter / A4 dimensions.
   */
  async exportPDF(
    data: IRecordSheetData,
    options: IPDFExportOptions = {
      paperSize: PaperSize.LETTER,
      includePilotData: false,
    },
  ): Promise<void> {
    const { paperSize, filename } = options;
    const { width, height } = PAPER_DIMENSIONS[paperSize];

    if (data.unitType === "mech") {
      await this.exportMechPDF(data, options);
      return;
    }

    // Non-mech: render SVG string → canvas → PDF
    const canvas = document.createElement("canvas");
    const scaledWidth = width * PDF_DPI_MULTIPLIER;
    const scaledHeight = height * PDF_DPI_MULTIPLIER;
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    const svgString = this.buildNonMechSVG(data);
    await renderSVGStringToCanvas(svgString, canvas, PDF_DPI_MULTIPLIER);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: paperSize === PaperSize.A4 ? "a4" : "letter",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, width, height);

    const pdfFilename =
      filename ||
      `${data.header.chassis}-${data.header.model}.pdf`.replace(/\s+/g, "-");
    pdf.save(pdfFilename);
  }

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

    const canvas = document.createElement("canvas");
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

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: paperSize === PaperSize.A4 ? "a4" : "letter",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, width, height);

    const pdfFilename =
      filename ||
      `${data.header.chassis}-${data.header.model}.pdf`.replace(/\s+/g, "-");
    pdf.save(pdfFilename);
  }

  /**
   * Build an SVG string for any non-mech unit type by calling the matching
   * per-type renderer. Throws `UnsupportedUnitTypeError` for the 'mech' case
   * (callers should use the mech pipeline) and unknown types.
   */
  private buildNonMechSVG(data: IRecordSheetData): string {
    switch (data.unitType) {
      case "vehicle":
        return renderVehicleSVG(data);
      case "aerospace":
        return renderAerospaceSVG(data);
      case "battlearmor":
        return renderBattleArmorSVG(data);
      case "infantry":
        return renderInfantrySVG(data);
      case "protomech":
        return renderProtoMechSVG(data);
      case "mech":
        throw new UnsupportedUnitTypeError("mech (use mech pipeline)");
      default: {
        // TypeScript exhaustiveness guard
        const _exhaustive: never = data;
        throw new UnsupportedUnitTypeError(
          (_exhaustive as { unitType: string }).unitType,
        );
      }
    }
  }

  // ── Print helper (unchanged) ─────────────────────────────────────────────

  /**
   * Print record sheet using browser print dialog.
   */
  print(canvas: HTMLCanvasElement): void {
    const dataUrl = canvas.toDataURL("image/png");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error(
        "Could not open print window. Check popup blocker settings.",
      );
    }

    const windowDoc = (printWindow as { document?: Document }).document;
    if (!windowDoc) {
      throw new Error("Print window does not have document access");
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
  }
}

const recordSheetServiceFactory: SingletonFactory<RecordSheetService> =
  createSingleton((): RecordSheetService => new RecordSheetService());

export function getRecordSheetService(): RecordSheetService {
  return recordSheetServiceFactory.get();
}

export function resetRecordSheetService(): void {
  recordSheetServiceFactory.reset();
}

// Legacy export for backward compatibility
// @deprecated Use getRecordSheetService() instead
export const recordSheetService = getRecordSheetService();
