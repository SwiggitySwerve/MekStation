/**
 * SVG Record Sheet Renderer
 *
 * Renders record sheets using MegaMek SVG templates.
 * Fills in template placeholders with unit data and loads armor/structure pips.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import { IRecordSheetData, PREVIEW_DPI_MULTIPLIER } from '@/types/printing';

import { fillArmorPips } from './armor';
import { renderToCanvasHighDPI } from './canvas';
import { ELEMENT_IDS } from './constants';
import { renderCriticalSlots } from './criticals';
import { renderEquipmentTable } from './equipment';
import { fillStructurePips } from './structure';
import {
  loadSVGTemplate,
  addDocumentMargins,
  hideSecondCrewPanel,
  fixCopyrightYear,
  setTextContent,
} from './template';

export class SVGRecordSheetRenderer {
  private svgDoc: Document | null = null;
  private svgRoot: SVGSVGElement | null = null;

  async loadTemplate(templatePath: string): Promise<void> {
    const result = await loadSVGTemplate(templatePath);
    this.svgDoc = result.svgDoc;
    this.svgRoot = result.svgRoot;
    addDocumentMargins(this.svgRoot);
  }

  fillTemplate(data: IRecordSheetData): void {
    if (!this.svgDoc || !this.svgRoot) {
      throw new Error('Template not loaded. Call loadTemplate first.');
    }

    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.TYPE,
      `${data.header.chassis} ${data.header.model}`,
    );
    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.TONNAGE,
      String(data.header.tonnage),
    );
    setTextContent(this.svgDoc, ELEMENT_IDS.TECH_BASE, data.header.techBase);
    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.RULES_LEVEL,
      data.header.rulesLevel,
    );
    setTextContent(this.svgDoc, ELEMENT_IDS.ROLE, 'Juggernaut');

    const engineRating = data.header.tonnage * data.movement.walkMP;
    setTextContent(this.svgDoc, ELEMENT_IDS.ENGINE_TYPE, `${engineRating} XL`);

    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.WALK_MP,
      String(data.movement.walkMP),
    );
    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.RUN_MP,
      String(data.movement.runMP),
    );
    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.JUMP_MP,
      String(data.movement.jumpMP),
    );

    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.BV,
      data.header.battleValue.toLocaleString(),
    );

    setTextContent(this.svgDoc, ELEMENT_IDS.ARMOR_TYPE, data.armor.type);
    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.STRUCTURE_TYPE,
      data.structure.type,
    );

    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.HEAT_SINK_TYPE,
      data.heatSinks.type,
    );
    setTextContent(
      this.svgDoc,
      ELEMENT_IDS.HEAT_SINK_COUNT,
      `${data.heatSinks.count}`,
    );

    setTextContent(this.svgDoc, ELEMENT_IDS.PILOT_NAME, '');
    setTextContent(this.svgDoc, ELEMENT_IDS.GUNNERY_SKILL, '');
    setTextContent(this.svgDoc, ELEMENT_IDS.PILOTING_SKILL, '');

    fixCopyrightYear(this.svgDoc);
    hideSecondCrewPanel(this.svgDoc);

    renderEquipmentTable(this.svgDoc, data.equipment);
    renderCriticalSlots(this.svgDoc, data.criticals);
  }

  async fillArmorPips(
    armor: IRecordSheetData['armor'],
    mechType?: string,
  ): Promise<void> {
    if (!this.svgDoc || !this.svgRoot) {
      throw new Error('Template not loaded');
    }
    await fillArmorPips(this.svgDoc, this.svgRoot, armor, mechType);
  }

  async fillStructurePips(
    structure: IRecordSheetData['structure'],
    tonnage: number,
    mechType?: string,
  ): Promise<void> {
    if (!this.svgDoc || !this.svgRoot) {
      throw new Error('Template not loaded');
    }
    await fillStructurePips(
      this.svgDoc,
      this.svgRoot,
      structure,
      tonnage,
      mechType,
    );
  }

  getSVGString(): string {
    if (!this.svgDoc) {
      throw new Error('Template not loaded');
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(this.svgDoc);
  }

  async renderToCanvas(canvas: HTMLCanvasElement): Promise<void> {
    await this.renderToCanvasHighDPI(canvas, PREVIEW_DPI_MULTIPLIER);
  }

  async renderToCanvasHighDPI(
    canvas: HTMLCanvasElement,
    dpiMultiplier: number,
  ): Promise<void> {
    const svgString = this.getSVGString();
    await renderToCanvasHighDPI(svgString, canvas, dpiMultiplier);
  }
}

export async function createSVGRenderer(
  templatePath: string,
): Promise<SVGRecordSheetRenderer> {
  const renderer = new SVGRecordSheetRenderer();
  await renderer.loadTemplate(templatePath);
  return renderer;
}
