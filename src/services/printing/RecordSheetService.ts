/**
 * Record Sheet Service
 * 
 * Orchestrates record sheet generation, preview rendering, and PDF export.
 * 
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import { jsPDF } from 'jspdf';
import {
  IRecordSheetData,
  PaperSize,
  PAPER_DIMENSIONS,
  PDF_DPI_MULTIPLIER,
  IPDFExportOptions,
} from '@/types/printing';
import { SVGRecordSheetRenderer } from './SVGRecordSheetRenderer';
import { SVG_TEMPLATES, SVG_TEMPLATES_A4 } from './recordsheet/constants';
import { IUnitConfig } from './recordsheet/types';
import { getMechType } from './recordsheet/mechTypeUtils';
import {
  extractHeader,
  extractMovement,
  extractArmor,
  extractStructure,
  extractEquipment,
  extractHeatSinks,
  extractCriticals,
} from './recordsheet/dataExtractors';

export type { IUnitConfig };

/**
 * Record Sheet Service class
 */
export class RecordSheetService {
  private static instance: RecordSheetService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): RecordSheetService {
    if (!RecordSheetService.instance) {
      RecordSheetService.instance = new RecordSheetService();
    }
    return RecordSheetService.instance;
  }

  /**
   * Extract record sheet data from unit configuration
   */
  extractData(unit: IUnitConfig): IRecordSheetData {
    return {
      header: extractHeader(unit),
      movement: extractMovement(unit),
      armor: extractArmor(unit),
      structure: extractStructure(unit),
      equipment: extractEquipment(unit),
      heatSinks: extractHeatSinks(unit),
      criticals: extractCriticals(unit),
      pilot: undefined,
      mechType: getMechType(unit.configuration),
    };
  }

  /**
   * Render preview using SVG template (MegaMekLab-style)
   */
  async renderPreview(
    canvas: HTMLCanvasElement,
    data: IRecordSheetData,
    paperSize: PaperSize = PaperSize.LETTER
  ): Promise<void> {
    const templates = paperSize === PaperSize.A4 ? SVG_TEMPLATES_A4 : SVG_TEMPLATES;
    const templatePath = templates[data.mechType] || templates.biped;
    
    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate(templatePath);
    renderer.fillTemplate(data);
    await renderer.fillArmorPips(data.armor, data.mechType);
    await renderer.fillStructurePips(data.structure, data.header.tonnage, data.mechType);
    await renderer.renderToCanvas(canvas);
  }

  async getSVGString(data: IRecordSheetData, paperSize: PaperSize = PaperSize.LETTER): Promise<string> {
    const templates = paperSize === PaperSize.A4 ? SVG_TEMPLATES_A4 : SVG_TEMPLATES;
    const templatePath = templates[data.mechType] || templates.biped;
    
    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate(templatePath);
    renderer.fillTemplate(data);
    await renderer.fillArmorPips(data.armor, data.mechType);
    await renderer.fillStructurePips(data.structure, data.header.tonnage, data.mechType);
    return renderer.getSVGString();
  }

  /**
   * Export to PDF and trigger download
   * Uses SVG template rendering with high-DPI (3x) for crisp text and graphics.
   */
  async exportPDF(
    data: IRecordSheetData,
    options: IPDFExportOptions = { paperSize: PaperSize.LETTER, includePilotData: false }
  ): Promise<void> {
    const { paperSize, filename } = options;
    const { width, height } = PAPER_DIMENSIONS[paperSize];

    const canvas = document.createElement('canvas');
    const scaledWidth = width * PDF_DPI_MULTIPLIER;
    const scaledHeight = height * PDF_DPI_MULTIPLIER;
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    const templates = paperSize === PaperSize.A4 ? SVG_TEMPLATES_A4 : SVG_TEMPLATES;
    const templatePath = templates[data.mechType] || templates.biped;

    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate(templatePath);
    renderer.fillTemplate(data);
    await renderer.fillArmorPips(data.armor, data.mechType);
    await renderer.fillStructurePips(data.structure, data.header.tonnage, data.mechType);
    await renderer.renderToCanvasHighDPI(canvas, PDF_DPI_MULTIPLIER);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: paperSize === PaperSize.A4 ? 'a4' : 'letter',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);

    const pdfFilename = filename || `${data.header.chassis}-${data.header.model}.pdf`.replace(/\s+/g, '-');
    pdf.save(pdfFilename);
  }

  /**
   * Print record sheet using browser print dialog
   */
  print(canvas: HTMLCanvasElement): void {
    const dataUrl = canvas.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window. Check popup blocker settings.');
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
  }
}

export const recordSheetService = RecordSheetService.getInstance();
