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
  PREVIEW_DPI_MULTIPLIER,
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
import { readSvgRootSize } from './svgRecordSheetRenderer/svgGeometry';

export type { IUnitConfig };

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

async function waitForPrintWindowReady(windowDoc: Document): Promise<void> {
  const fonts = (
    windowDoc as Document & { fonts?: { ready?: Promise<unknown> } }
  ).fonts;
  if (fonts && typeof fonts.ready?.then === 'function') {
    await fonts.ready;
  }

  const images = Array.from(windowDoc.images ?? []);
  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  );
}

function rootHasValidViewBox(svgRoot: Element): boolean {
  const value = svgRoot.getAttribute('viewBox');
  if (!value) {
    return false;
  }
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return (
    parts.length === 4 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1]) &&
    parts[2] > 0 &&
    parts[3] > 0
  );
}

/**
 * Inline print CSS sizes the root SVG to the selected paper. Without a root
 * viewBox, user units stay at 1:1 and the sheet does not scale. Add
 * `0 0 width height` only when missing; leave existing viewBoxes untouched
 * (including negative-margin mech origins).
 */
function ensurePrintSvgViewBox(svgString: string): string {
  if (typeof DOMParser === 'undefined') {
    return svgString;
  }
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    return svgString;
  }
  const root = doc.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg') {
    return svgString;
  }
  if (rootHasValidViewBox(root)) {
    return svgString;
  }
  const size = readSvgRootSize(root);
  root.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
  return new XMLSerializer().serializeToString(doc);
}

function buildPrintDocumentHtml(
  svgString: string,
  paperSize: PaperSize,
): string {
  const { width, height } = PAPER_DIMENSIONS[paperSize];
  const printSvg = ensurePrintSvgViewBox(svgString);
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Record Sheet</title>
    <style>
      @page { size: ${width}pt ${height}pt; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        width: ${width}pt;
        height: ${height}pt;
      }
      body > svg,
      body > img {
        display: block;
        width: ${width}pt;
        height: ${height}pt;
      }
    </style>
  </head>
  <body>
    ${printSvg}
  </body>
</html>`;
}

/**
 * Browser print-popup surface. `window.open` is overloaded by Electron to
 * return `BrowserWindowProxy`, which lacks afterprint / addEventListener.
 * The MekStation customizer print path is a real browser Window.
 */
interface BrowserPrintWindow {
  readonly document?: Document;
  close(): void;
  print(): void;
  addEventListener(
    type: 'afterprint',
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

function openBrowserPrintWindow(): BrowserPrintWindow | null {
  return window.open('', '_blank') as BrowserPrintWindow | null;
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
      header: {
        ...extractHeader(unit),
        engineDescription: `${unit.engine.rating} ${unit.engine.type}`,
      },
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
   * Render a preview of any unit type to a canvas from the shared SVG.
   */
  renderPreview = async (
    canvas: HTMLCanvasElement,
    data: IRecordSheetData,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<void> => {
    const svgString = await this.getSVGString(data, paperSize);
    await renderToCanvasHighDPI(
      svgString,
      canvas,
      PREVIEW_DPI_MULTIPLIER,
      paperSize,
    );
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
   * Rasterizes the shared SVG at bounded 4x and embeds a lossless PNG.
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
    const canvas = document.createElement('canvas');
    const svgString = await this.getSVGString(data, paperSize);
    await renderToCanvasHighDPI(
      svgString,
      canvas,
      PDF_DPI_MULTIPLIER,
      paperSize,
    );

    const PDF = await getJsPDFConstructor();
    const pdf = new PDF({
      orientation: 'portrait',
      unit: 'pt',
      format: paperSize === PaperSize.A4 ? 'a4' : 'letter',
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, width, height, undefined, 'FAST');

    const pdfFilename =
      filename ||
      `${data.header.chassis}-${data.header.model}.pdf`.replace(/\s+/g, '-');
    pdf.save(pdfFilename);
  };

  // ── Internal SVG builders ────────────────────────────────────────────────

  private async getMechSVGString(
    data: IMechRecordSheetData,
    paperSize: PaperSize,
  ): Promise<string> {
    const templates =
      paperSize === PaperSize.A4 ? SVG_TEMPLATES_A4 : SVG_TEMPLATES;
    const templatePath = templates[data.mechType] || templates.biped;

    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate(templatePath, paperSize);
    renderer.fillTemplate(data);
    await renderer.fillArmorPips(data.armor, data.mechType);
    await renderer.fillStructurePips(
      data.structure,
      data.header.tonnage,
      data.mechType,
    );
    return renderer.getSVGString();
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

  // ── Print helpers ────────────────────────────────────────────────────────

  /**
   * Print a record sheet from the shared SVG at the selected paper size.
   * Opens the popup synchronously before the first await so popup blockers
   * do not discard a window reserved after rasterization.
   */
  printRecordSheet = async (
    data: IRecordSheetData,
    paperSize: PaperSize,
  ): Promise<void> => {
    const printWindow = openBrowserPrintWindow();
    if (!printWindow) {
      throw new Error(
        'Could not open print window. Check popup blocker settings.',
      );
    }

    const windowDoc = printWindow.document;
    if (!windowDoc) {
      printWindow.close();
      throw new Error('Print window does not have document access');
    }

    let closed = false;
    const closeOwned = (): void => {
      if (closed) {
        return;
      }
      closed = true;
      printWindow.close();
    };

    try {
      const svgString = await this.getSVGString(data, paperSize);
      if (typeof windowDoc.open === 'function') {
        windowDoc.open();
      }
      windowDoc.write(buildPrintDocumentHtml(svgString, paperSize));
      windowDoc.close();
      await waitForPrintWindowReady(windowDoc);

      printWindow.addEventListener('afterprint', closeOwned, { once: true });
      printWindow.print();
    } catch (error) {
      closeOwned();
      throw error;
    }
  };

  /**
   * Print record sheet using browser print dialog from an existing canvas.
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
