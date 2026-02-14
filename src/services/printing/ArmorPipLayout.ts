import { processGroupedByFiveLayout } from './ArmorPipLayout.grouped';
import { processStandardLayout } from './ArmorPipLayout.processing';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PRECISION = 0.01;
const DEFAULT_PIP_STROKE = 0.5;
const FILL_WHITE = '#FFFFFF';
const MML_GAP = 'mml-gap';
const MML_MULTISECTION = 'mml-multisection';

export interface PipOptions {
  pipRadius?: number;
  strokeWidth?: number;
  fill?: string;
  className?: string;
  staggered?: boolean;
  groupByFive?: boolean;
}

export class Bounds {
  constructor(
    public readonly left: number,
    public readonly top: number,
    public readonly right: number,
    public readonly bottom: number,
  ) {}

  get width(): number {
    return this.right - this.left;
  }

  get height(): number {
    return this.bottom - this.top;
  }

  get centerX(): number {
    return this.left + this.width / 2;
  }

  get centerY(): number {
    return this.top + this.height / 2;
  }

  static fromRect(rect: Element): Bounds {
    const x = parseFloat(rect.getAttribute('x') || '0');
    const y = parseFloat(rect.getAttribute('y') || '0');
    const width = parseFloat(rect.getAttribute('width') || '0');
    const height = parseFloat(rect.getAttribute('height') || '0');
    return new Bounds(x, y, x + width, y + height);
  }

  static empty(): Bounds {
    return new Bounds(0, 0, 0, 0);
  }
}

export class ArmorPipLayout {
  private readonly svgDoc: Document;
  private readonly group: Element;
  private readonly strokeWidth: number;
  private readonly fill: string;
  private readonly className?: string;
  private readonly bounds: Bounds;
  private readonly avgHeight: number;
  private readonly avgWidth: number;
  private readonly regions: Map<number, Bounds> = new Map();
  private readonly negativeRegions: Map<number, Bounds> = new Map();

  static addPips(
    svgDoc: Document,
    group: Element,
    pipCount: number,
    options: PipOptions = {},
  ): void {
    if (pipCount <= 0) {
      return;
    }

    const {
      strokeWidth = DEFAULT_PIP_STROKE,
      fill = FILL_WHITE,
      className,
      staggered = false,
      groupByFive = false,
    } = options;

    const multiVal = ArmorPipLayout.parseStyle(group, MML_MULTISECTION);
    const isMulti = multiVal === 'true';

    if (isMulti) {
      ArmorPipLayout.handleMultiSection(svgDoc, group, pipCount, options);
      return;
    }

    const layout = new ArmorPipLayout(
      svgDoc,
      group,
      strokeWidth,
      fill,
      className,
    );
    if (layout.regions.size === 0) {
      return;
    }

    if (groupByFive) {
      layout.processGroupedByFive(pipCount, staggered);
    } else {
      layout.process(pipCount, staggered);
    }
  }

  private static handleMultiSection(
    svgDoc: Document,
    group: Element,
    pipCount: number,
    options: PipOptions,
  ): void {
    const sections: ArmorPipLayout[] = [];
    let totalArea = 0;

    const children = group.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName !== 'g') {
        continue;
      }

      const section = new ArmorPipLayout(
        svgDoc,
        child,
        options.strokeWidth ?? DEFAULT_PIP_STROKE,
        options.fill ?? FILL_WHITE,
        options.className,
      );

      if (section.regions.size === 0) {
        continue;
      }

      sections.push(section);
      totalArea += section.avgWidth * section.bounds.height;
    }

    if (sections.length === 0) {
      return;
    }

    const pipCounts: number[] = [];
    let allocated = 0;
    for (const section of sections) {
      const pips = Math.round(
        pipCount * ((section.avgWidth * section.bounds.height) / totalArea),
      );
      allocated += pips;
      pipCounts.push(pips);
    }

    let i = 0;
    while (pipCount > allocated) {
      const row = i % sections.length;
      pipCounts[row]++;
      allocated++;
      i++;
    }

    while (pipCount < allocated) {
      const row = sections.length - 1 - (i % sections.length);
      if (pipCounts[row] > 0) {
        pipCounts[row]--;
        allocated--;
      }
      i++;
    }

    for (let s = 0; s < sections.length; s++) {
      if (pipCounts[s] > 0) {
        sections[s].process(pipCounts[s], options.staggered ?? false);
      }
    }
  }

  private static parseStyle(element: Element, key: string): string | null {
    const style = element.getAttribute('style');
    if (!style) {
      return null;
    }

    const regex = new RegExp(`${key}\\s*:\\s*([^;]+)`);
    const match = style.match(regex);
    return match ? match[1].trim() : null;
  }

  private constructor(
    svgDoc: Document,
    group: Element,
    strokeWidth: number,
    fill: string,
    className?: string,
  ) {
    this.svgDoc = svgDoc;
    this.group = group;
    this.strokeWidth = strokeWidth;
    this.fill = fill;
    this.className = className;
    this.bounds = this.processRegions();

    const heights = Array.from(this.regions.values()).map((b) => b.height);
    const widths = Array.from(this.regions.values()).map((b) => b.width);
    const negativeWidths = Array.from(this.negativeRegions.values()).map(
      (b) => b.width,
    );

    this.avgHeight =
      heights.length > 0
        ? heights.reduce((a, b) => a + b, 0) / heights.length
        : 0;
    this.avgWidth =
      widths.length > 0
        ? (widths.reduce((a, b) => a + b, 0) -
            negativeWidths.reduce((a, b) => a + b, 0)) /
          widths.length
        : 0;
  }

  private processRegions(): Bounds {
    let left = Infinity;
    let top = Infinity;
    let right = 0;
    let bottom = 0;

    const children = this.group.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName !== 'rect') {
        continue;
      }

      const bbox = Bounds.fromRect(child);

      if (bbox.left < left) {
        left = bbox.left;
      }
      if (bbox.top < top) {
        top = bbox.top;
      }
      if (bbox.right > right) {
        right = bbox.right;
      }
      if (bbox.bottom > bottom) {
        bottom = bbox.bottom;
      }

      this.regions.set(bbox.top, bbox);

      const gap = this.parseGap(bbox, child);
      if (gap) {
        this.negativeRegions.set(bbox.top, gap);
      }
    }

    if (left === Infinity) {
      return Bounds.empty();
    }

    return new Bounds(left, top, right, bottom);
  }

  private parseGap(bbox: Bounds, rect: Element): Bounds | null {
    const gap = ArmorPipLayout.parseStyle(rect, MML_GAP);
    if (!gap) {
      return null;
    }

    const parts = gap.split(',');
    if (parts.length !== 2) {
      return null;
    }

    const gapLeft = parseFloat(parts[0]);
    const gapRight = parseFloat(parts[1]);
    if (
      Number.isNaN(gapLeft) ||
      Number.isNaN(gapRight) ||
      gapLeft >= gapRight ||
      gapLeft < bbox.left - PRECISION ||
      gapRight > bbox.right + PRECISION
    ) {
      return null;
    }

    return new Bounds(gapLeft, bbox.top, gapRight, bbox.bottom);
  }

  private processGroupedByFive(pipCount: number, staggered: boolean): void {
    processGroupedByFiveLayout(
      {
        pipCount,
        staggered,
        bounds: this.bounds,
        avgHeight: this.avgHeight,
        avgWidth: this.avgWidth,
        regions: this.regions,
        negativeRegions: this.negativeRegions,
        drawPip: (x, y, radius) => this.drawPip(x, y, radius),
      },
      () => this.process(pipCount, staggered),
    );
  }

  private process(pipCount: number, staggered: boolean): void {
    processStandardLayout({
      pipCount,
      staggered,
      bounds: this.bounds,
      avgHeight: this.avgHeight,
      avgWidth: this.avgWidth,
      regions: this.regions,
      negativeRegions: this.negativeRegions,
      drawPip: (x, y, radius) => this.drawPip(x, y, radius),
    });
  }

  private drawPip(x: number, y: number, radius: number): void {
    const pip = this.svgDoc.createElementNS(SVG_NS, 'circle');
    pip.setAttribute('cx', String(x + radius));
    pip.setAttribute('cy', String(y + radius));
    pip.setAttribute('r', String(radius));
    pip.setAttribute('fill', this.fill);
    pip.setAttribute('stroke', '#000000');
    pip.setAttribute('stroke-width', String(this.strokeWidth));

    if (this.className) {
      pip.setAttribute('class', this.className);
    }

    this.group.appendChild(pip);
  }
}
