/**
 * ArmorPipLayout - Port of MegaMekLab's ArmorPipLayout.java
 *
 * Utility for determining placement of armor and structure pips.
 * The position and shape of the space is defined by rect elements in an SVG group.
 * This calculates the number of rows of pips, how many to place in each row,
 * and how far apart to space them.
 *
 * The region should be a <g> group containing one or more <rect> elements.
 * The rect elements define horizontal bands that mark the position and shape.
 * The average height of the elements is used as the starting size of the pips,
 * though they may be scaled down to fit.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Margin of error used for checking equality between floating point values */
const PRECISION = 0.01;

/** Default pip size as a fraction of cell height */
const DEFAULT_PIP_SIZE = 0.4;

/** Default stroke width for pip outlines */
const DEFAULT_PIP_STROKE = 0.5;

/** Default fill color for pips */
const FILL_WHITE = '#FFFFFF';

/** Style attribute key for gap definition */
const MML_GAP = 'mml-gap';

/** Style attribute key for multi-section layouts */
const MML_MULTISECTION = 'mml-multisection';

/**
 * Options for pip rendering
 */
export interface PipOptions {
  /** Pip radius (auto-calculated if not provided) */
  pipRadius?: number;
  /** Width of the pip outline stroke */
  strokeWidth?: number;
  /** Fill color for the pip interior */
  fill?: string;
  /** CSS class to apply to pips */
  className?: string;
  /** Whether to use staggered layout for denser packing */
  staggered?: boolean;
  /** Whether to try grouping pips in sets of 5 */
  groupByFive?: boolean;
}

/**
 * Rectangle bounds helper class
 */
class Bounds {
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

/**
 * ArmorPipLayout - generates pip positions within SVG bounding regions
 */
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

  /**
   * Static entry point to add pips to a group element
   */
  static addPips(
    svgDoc: Document,
    group: Element,
    pipCount: number,
    options: PipOptions = {},
  ): void {
    if (pipCount <= 0) return;

    const {
      strokeWidth = DEFAULT_PIP_STROKE,
      fill = FILL_WHITE,
      className,
      staggered = false,
      groupByFive = false,
    } = options;

    // Check for multi-section layout
    const multiVal = ArmorPipLayout.parseStyle(group, MML_MULTISECTION);
    const isMulti = multiVal === 'true';

    if (isMulti) {
      ArmorPipLayout.handleMultiSection(svgDoc, group, pipCount, options);
    } else {
      const layout = new ArmorPipLayout(
        svgDoc,
        group,
        strokeWidth,
        fill,
        className,
      );
      if (layout.regions.size > 0) {
        if (groupByFive) {
          layout.processGroupedByFive(pipCount, staggered);
        } else {
          layout.process(pipCount, staggered);
        }
      }
    }
  }

  /**
   * Handle multi-section layouts where pips are split across multiple sub-groups
   */
  private static handleMultiSection(
    svgDoc: Document,
    group: Element,
    pipCount: number,
    options: PipOptions,
  ): void {
    const sections: ArmorPipLayout[] = [];
    let totalArea = 0;

    // Find all child groups and calculate their areas
    const children = group.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === 'g') {
        const section = new ArmorPipLayout(
          svgDoc,
          child,
          options.strokeWidth ?? DEFAULT_PIP_STROKE,
          options.fill ?? FILL_WHITE,
          options.className,
        );
        if (section.regions.size > 0) {
          sections.push(section);
          totalArea += section.avgWidth * section.bounds.height;
        }
      }
    }

    if (sections.length === 0) return;

    // Distribute pips proportionally by area
    const pipCounts: number[] = [];
    let allocated = 0;
    for (const section of sections) {
      const pips = Math.round(
        pipCount * ((section.avgWidth * section.bounds.height) / totalArea),
      );
      allocated += pips;
      pipCounts.push(pips);
    }

    // Handle rounding by distributing remaining pips
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

    // Process each section
    for (let s = 0; s < sections.length; s++) {
      if (pipCounts[s] > 0) {
        sections[s].process(pipCounts[s], options.staggered ?? false);
      }
    }
  }

  /**
   * Parse a style attribute value from an element
   */
  private static parseStyle(element: Element, key: string): string | null {
    const style = element.getAttribute('style');
    if (!style) return null;

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

    // Calculate average dimensions
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

  /**
   * Process rect elements to build the region map
   */
  private processRegions(): Bounds {
    let left = Infinity;
    let top = Infinity;
    let right = 0;
    let bottom = 0;

    const children = this.group.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === 'rect') {
        const bbox = Bounds.fromRect(child);

        if (bbox.left < left) left = bbox.left;
        if (bbox.top < top) top = bbox.top;
        if (bbox.right > right) right = bbox.right;
        if (bbox.bottom > bottom) bottom = bbox.bottom;

        this.regions.set(bbox.top, bbox);

        // Check for gap definition
        const gap = this.parseGap(bbox, child);
        if (gap) {
          this.negativeRegions.set(bbox.top, gap);
        }
      }
    }

    if (left === Infinity) {
      return Bounds.empty();
    }

    return new Bounds(left, top, right, bottom);
  }

  /**
   * Parse gap definition from rect element style
   */
  private parseGap(bbox: Bounds, rect: Element): Bounds | null {
    const gap = ArmorPipLayout.parseStyle(rect, MML_GAP);
    if (!gap) return null;

    const parts = gap.split(',');
    if (parts.length !== 2) return null;

    try {
      const gapLeft = parseFloat(parts[0]);
      const gapRight = parseFloat(parts[1]);

      if (
        gapLeft < gapRight &&
        gapLeft >= bbox.left - PRECISION &&
        gapRight <= bbox.right + PRECISION
      ) {
        return new Bounds(gapLeft, bbox.top, gapRight, bbox.bottom);
      }
    } catch {
      // Invalid gap format
    }

    return null;
  }

  /**
   * Get region entries sorted from middle outward (for groupByFive mode)
   */
  private *iterateRegionsFromMiddle(): Generator<Bounds> {
    const entries = Array.from(this.regions.values());
    let left = Math.floor(entries.length / 2) - 1;
    let right = Math.floor(entries.length / 2);
    let nextRight = true;

    while (left >= 0 || right < entries.length) {
      if (nextRight && right < entries.length) {
        yield entries[right++];
      } else if (left >= 0) {
        yield entries[left--];
      }
      nextRight = !nextRight;
    }
  }

  /**
   * Process pips using the "grouped by 5" algorithm
   */
  private processGroupedByFive(pipCount: number, staggered: boolean): void {
    let attempts = 0;
    const firstRegion = this.regions.values().next().value;
    if (!firstRegion) return;

    let diameter = firstRegion.height;
    const originalDiameter = diameter;

    let remaining: number;
    let pips: Array<{ x: number; y: number }>;

    do {
      remaining = pipCount;
      pips = [];

      for (const bbox of Array.from(this.iterateRegionsFromMiddle())) {
        let capacity = Math.floor(bbox.width / diameter);
        capacity -= Math.floor(capacity / 6);

        const groups = Math.min(
          Math.floor(remaining / 5),
          Math.floor(capacity / 5),
        );
        remaining -= groups * 5;
        capacity -= groups * 5;

        let leftovers = 0;
        if (remaining % 5 !== 0 && capacity >= remaining % 5) {
          leftovers = remaining % 5;
          remaining -= leftovers;
        }

        let totalWidth = groups * diameter * 6;
        if (leftovers > 0) {
          totalWidth += leftovers * diameter;
        } else {
          totalWidth -= diameter;
        }

        const posY = bbox.top;
        let posX = bbox.centerX - totalWidth / 2;

        for (let g = 0; g < groups; g++) {
          for (let j = 0; j < 5; j++) {
            pips.push({ x: posX, y: posY });
            posX += diameter;
          }
          posX += diameter; // Gap between groups
        }

        for (let l = 0; l < leftovers; l++) {
          pips.push({ x: posX, y: posY });
          posX += diameter;
        }

        if (remaining === 0) break;
      }

      if (remaining > 0) {
        attempts++;
        if (attempts > 5) {
          // Fall back to regular processing
          this.process(pipCount, staggered);
          return;
        }
        diameter *= 0.9;
      }
    } while (remaining > 0);

    // Draw the pips
    for (const pip of pips) {
      this.drawPip(
        pip.x,
        pip.y + (originalDiameter / 2 - diameter / 2.2),
        diameter / 2.2,
      );
    }
  }

  /**
   * Main processing algorithm - calculates pip layout and draws them
   */
  private process(pipCount: number, staggered: boolean): void {
    if (this.bounds.width === 0 || this.bounds.height === 0) return;

    // Estimate number of rows based on aspect ratio
    let nRows = Math.max(
      1,
      Math.round(
        Math.sqrt((pipCount * this.bounds.height) / this.bounds.width),
      ),
    );

    // Don't allocate more rows than pips
    if (nRows > pipCount) {
      nRows = pipCount;
    }

    // Calculate average pips per column
    let nCols = Math.min(
      Math.floor(pipCount / nRows),
      Math.floor(this.avgWidth / this.avgHeight),
    );

    // Adjust to fit all pips
    while (nCols * nRows < pipCount && nRows <= pipCount) {
      if (this.avgWidth / nCols > this.bounds.height / nRows) {
        nCols++;
      } else {
        nRows++;
      }
    }

    let radius = this.avgHeight * DEFAULT_PIP_SIZE;
    let spacing = Math.min(this.avgHeight, this.bounds.height / nRows);

    // If orthogonal arrangement doesn't work, use staggered and scale down
    if (spacing < this.avgHeight) {
      staggered = true;
      radius = Math.min(radius, spacing * 0.5);
    }

    // Build row data
    const rowCount: number[] = [];
    const rows: Bounds[] = [];
    const gaps: Bounds[] = [];

    // Expand spacing geometrically to reduce crowding
    spacing =
      (Math.sqrt((spacing * nRows) / this.bounds.height) * this.bounds.height) /
      nRows;

    let yPosition = Math.max(
      this.bounds.top,
      this.bounds.top +
        (this.bounds.height - spacing * nRows) / 2 +
        spacing * 0.5 -
        radius,
    );

    let shift = 0;
    let parity = nCols % 2;

    const sortedRegions = Array.from(this.regions.entries()).sort(
      (a, b) => a[0] - b[0],
    );

    for (let r = 0; r < nRows; r++) {
      // Find bounding regions for this row
      const upper = this.findFloorRegion(yPosition, sortedRegions);
      const lower = this.findCeilingRegion(yPosition, sortedRegions) ?? upper;

      if (!upper) {
        yPosition += spacing;
        continue;
      }

      const lowerBounds = lower ?? upper;
      const row = new Bounds(
        Math.max(upper.left, lowerBounds.left),
        yPosition,
        Math.min(upper.right, lowerBounds.right),
        yPosition + spacing,
      );

      const upperKey = this.findFloorKey(yPosition, sortedRegions);
      const lowerKey = this.findCeilingKey(yPosition, sortedRegions);
      const gap = this.mergeGaps(
        row,
        upperKey !== null ? this.negativeRegions.get(upperKey) : undefined,
        lowerKey !== null ? this.negativeRegions.get(lowerKey) : undefined,
      );

      // Skip row if gap covers entire width
      if (
        gap.width > 0 &&
        gap.left <= row.left + PRECISION &&
        gap.right >= row.right - PRECISION
      ) {
        yPosition += spacing;
        continue;
      }

      rows.push(row);
      gaps.push(gap);

      // Calculate pip count for this row
      let count = staggered
        ? Math.floor(nCols * ((row.width - gap.width) / this.avgWidth) * 0.5)
        : Math.floor(nCols * ((row.width - gap.width) / this.avgWidth));

      // Handle mirrored rows (split by gap)
      const mirror =
        gap.width > 0 &&
        Math.abs(gap.left - row.left - (row.right - gap.right)) < spacing;

      if ((mirror && count % 2 === 1) || (!mirror && count % 2 !== parity)) {
        if (shift <= 0 || count === 0) {
          count++;
          shift--;
        } else {
          count--;
          shift++;
        }
        if (count * spacing * 2 > row.width && count >= 2) {
          count -= 2;
        }
      }

      rowCount.push(count);
      yPosition += spacing;

      if (staggered) {
        parity = 1 - parity;
      }
    }

    // Adjust counts to match exact pip count
    const xSpacing = this.adjustCount(
      pipCount,
      rows,
      gaps,
      rowCount,
      staggered,
      spacing,
    );

    // Draw the pips
    this.drawPips(
      rows,
      gaps,
      rowCount,
      staggered,
      Math.min(radius, xSpacing * 0.4),
      xSpacing,
    );
  }

  private findFloorRegion(
    y: number,
    sorted: Array<[number, Bounds]>,
  ): Bounds | null {
    let result: Bounds | null = null;
    for (const [key, bounds] of sorted) {
      if (key <= y) {
        result = bounds;
      } else {
        break;
      }
    }
    return result;
  }

  private findCeilingRegion(
    y: number,
    sorted: Array<[number, Bounds]>,
  ): Bounds | null {
    for (const [key, bounds] of sorted) {
      if (key >= y) {
        return bounds;
      }
    }
    return null;
  }

  private findFloorKey(
    y: number,
    sorted: Array<[number, Bounds]>,
  ): number | null {
    let result: number | null = null;
    for (const [key] of sorted) {
      if (key <= y) {
        result = key;
      } else {
        break;
      }
    }
    return result;
  }

  private findCeilingKey(
    y: number,
    sorted: Array<[number, Bounds]>,
  ): number | null {
    for (const [key] of sorted) {
      if (key >= y) {
        return key;
      }
    }
    return null;
  }

  /**
   * Merge gaps from adjacent rows
   */
  private mergeGaps(row: Bounds, gap1?: Bounds, gap2?: Bounds): Bounds {
    if (!gap1 && !gap2) {
      return new Bounds(0, row.top, 0, row.bottom);
    }

    let left: number;
    let right: number;

    if (!gap2) {
      left = gap1!.left;
      right = gap1!.right;
    } else if (!gap1) {
      left = gap2.left;
      right = gap2.right;
    } else {
      left = Math.min(gap1.left, gap2.left);
      right = Math.max(gap1.right, gap2.right);
    }

    return new Bounds(
      Math.max(left, row.left),
      row.top,
      Math.min(right, row.right),
      row.bottom,
    );
  }

  /**
   * Adjust pip counts per row to match exact total
   */
  private adjustCount(
    pipCount: number,
    rows: Bounds[],
    gaps: Bounds[],
    rowCount: number[],
    staggered: boolean,
    spacing: number,
  ): number {
    let current = rowCount.reduce((a, b) => a + b, 0);

    if (current === pipCount) {
      return spacing;
    }

    // Sort indices by available space
    const indices = Array.from({ length: rows.length }, (_, i) => i).sort(
      (a, b) =>
        rowCount[a] / (rows[a].width - gaps[a].width) -
        rowCount[b] / (rows[b].width - gaps[b].width),
    );

    // Track mirrored rows
    const mirrored = rows.map(
      (row, i) =>
        gaps[i].width > 0 &&
        Math.abs(gaps[i].left - row.left - (row.right - gaps[i].right)) <
          spacing,
    );
    const allMirrored = mirrored.every(Boolean);

    const rowDelta = staggered ? 2 : 1;
    let row = 0;
    let skipped: number;
    let minimum = true;

    do {
      skipped = 0;
      while (current !== pipCount && skipped < rows.length) {
        const index = indices[row % indices.length];
        const mirror =
          mirrored[index] && (!allMirrored || Math.abs(pipCount - current) > 1);

        if (pipCount > current) {
          let change: number;
          if (pipCount - current === 1) {
            change = mirror ? 0 : 1;
          } else {
            change = mirror ? 2 : rowDelta;
          }

          if (
            change > 0 &&
            spacing * (rowCount[index] + change) <=
              rows[index].width - gaps[index].width
          ) {
            rowCount[index] += change;
            current += change;
          } else {
            skipped++;
          }
        } else {
          let change: number;
          if (current - pipCount === 1) {
            change = mirror && minimum ? 0 : 1;
          } else {
            change = mirror ? 2 : rowDelta;
          }

          if (minimum && rowCount[index] - change <= 0) {
            change = 0;
          } else {
            change = Math.min(change, rowCount[index]);
          }

          if (change > 0) {
            rowCount[index] -= change;
            current -= change;
          } else {
            skipped++;
          }
        }
        row++;
      }

      if (skipped === rows.length) {
        if (current < pipCount) {
          spacing *= 0.95;
        } else {
          minimum = false;
        }
      }
    } while (skipped === rows.length);

    return spacing;
  }

  /**
   * Draw all pips at calculated positions
   */
  private drawPips(
    rows: Bounds[],
    gaps: Bounds[],
    rowCount: number[],
    staggered: boolean,
    radius: number,
    xSpacing: number,
  ): void {
    const dx = staggered ? xSpacing * 2 : xSpacing;

    // Find the row taking up the largest percentage of its width
    let pct = 0;
    for (let r = 0; r < rows.length; r++) {
      if (rowCount[r] > (gaps[r].width > 0 ? 2 : 1)) {
        pct = Math.max(
          pct,
          (dx * rowCount[r]) / (rows[r].width - gaps[r].width),
        );
      }
    }

    let adjustedDx = dx;
    if (pct > 1.0) {
      adjustedDx /= pct;
    } else if (pct > 0) {
      adjustedDx /= Math.sqrt(pct);
    }

    // Start by centering the top row
    let centerX = rows[0]?.centerX ?? 0;
    const xPadding = adjustedDx * 0.5 - radius;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];

      if (gaps[r].width > 0) {
        // Split row around gap
        const leftBounds = new Bounds(
          row.left,
          row.top,
          gaps[r].left,
          row.bottom,
        );
        const rightBounds = new Bounds(
          gaps[r].right,
          row.top,
          row.right,
          row.bottom,
        );
        const leftCount = Math.round(
          rowCount[r] *
            (leftBounds.width / (leftBounds.width + rightBounds.width)),
        );

        this.drawRow(
          leftBounds,
          leftCount,
          radius,
          adjustedDx,
          centerX,
          xPadding,
        );
        this.drawRow(
          rightBounds,
          rowCount[r] - leftCount,
          radius,
          adjustedDx,
          centerX,
          xPadding,
        );
        centerX = row.centerX;
      } else {
        centerX = this.drawRow(
          row,
          rowCount[r],
          radius,
          adjustedDx,
          centerX,
          xPadding,
        );
      }
    }
  }

  /**
   * Draw a single row of pips
   */
  private drawRow(
    row: Bounds,
    count: number,
    radius: number,
    dx: number,
    centerX: number,
    xPadding: number,
  ): number {
    let xPosition = this.calcRowStartX(centerX, count, dx) + xPadding;

    // Shift if outside bounds
    while (xPosition < row.left) {
      xPosition += dx;
    }
    while (xPosition + dx * count > row.right) {
      xPosition -= dx;
    }

    // Re-center if still outside or only one pip
    if (xPosition < row.left || count === 1) {
      centerX = row.centerX;
      xPosition = this.calcRowStartX(centerX, count, dx) + xPadding;
    }

    for (let i = 0; i < count; i++) {
      this.drawPip(xPosition, row.top, radius);
      xPosition += dx;
    }

    return centerX;
  }

  /**
   * Calculate the x coordinate of the leftmost pip to center the row
   */
  private calcRowStartX(
    center: number,
    pipCount: number,
    cellWidth: number,
  ): number {
    return center - cellWidth * (pipCount / 2);
  }

  /**
   * Draw a single pip circle
   */
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
