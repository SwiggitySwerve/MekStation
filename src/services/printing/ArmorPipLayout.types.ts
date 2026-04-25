// Leaf module: pure types/classes shared across ArmorPipLayout siblings.
// Must NOT import from ./ArmorPipLayout, ./ArmorPipLayout.grouped, or
// ./ArmorPipLayout.processing — keeps the printing dependency graph acyclic.

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

export interface ProcessLayoutParams {
  pipCount: number;
  staggered: boolean;
  bounds: Bounds;
  avgHeight: number;
  avgWidth: number;
  regions: Map<number, Bounds>;
  negativeRegions: Map<number, Bounds>;
  drawPip: (x: number, y: number, radius: number) => void;
}
