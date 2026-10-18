/**
 * SVG viewBox / paper-fit helpers for record-sheet rasterization.
 *
 * Canonical MegaMek sheets put page size on the root width/height and have
 * no root viewBox. Nested logos still carry a 69×69 viewBox, so scans of
 * the whole XML string must not be used.
 */

export interface SvgSize {
  readonly width: number;
  readonly height: number;
}

export interface SvgViewBoxRect {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

export interface FittedRect {
  readonly destWidth: number;
  readonly destHeight: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

const FALLBACK_SVG_SIZE: SvgSize = { width: 576, height: 756 };

/** Offset from the content bottom into the added paper margin (US: 756+6=762). */
export const FOOTER_MARGIN_OFFSET = 6;

function isUsableSize(width: number, height: number): boolean {
  return (
    Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
  );
}

function parseViewBoxRect(viewBox: string): SvgViewBoxRect | null {
  const parts = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    parts.length === 4 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1]) &&
    isUsableSize(parts[2], parts[3])
  ) {
    return {
      minX: parts[0],
      minY: parts[1],
      width: parts[2],
      height: parts[3],
    };
  }
  return null;
}

function parseViewBoxParts(viewBox: string): SvgSize | null {
  const rect = parseViewBoxRect(viewBox);
  if (!rect) {
    return null;
  }
  return { width: rect.width, height: rect.height };
}

function sizeFromWidthHeight(
  widthAttr: string | null,
  heightAttr: string | null,
): SvgSize | null {
  const width = Number.parseFloat(widthAttr ?? '');
  const height = Number.parseFloat(heightAttr ?? '');
  if (isUsableSize(width, height)) {
    return { width, height };
  }
  return null;
}

function sizeFromOpenTag(tag: string): SvgSize | null {
  const widthMatch = tag.match(/\bwidth\s*=\s*["']([\d.]+)/i);
  const heightMatch = tag.match(/\bheight\s*=\s*["']([\d.]+)/i);
  const fromAttrs = sizeFromWidthHeight(
    widthMatch?.[1] ?? null,
    heightMatch?.[1] ?? null,
  );
  if (fromAttrs) {
    return fromAttrs;
  }
  const viewBoxMatch = tag.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    return parseViewBoxParts(viewBoxMatch[1]);
  }
  return null;
}

function parseRootSvgElement(svgString: string): Element | null {
  if (typeof DOMParser === 'undefined') {
    return null;
  }
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    return null;
  }
  const root = doc.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg') {
    return null;
  }
  return root;
}

/** Read width/height from a serialized SVG string (root element only). */
export function parseSvgViewBox(svgString: string): SvgSize {
  const root = parseRootSvgElement(svgString);
  if (root) {
    return readSvgRootSize(root);
  }

  const openTag = svgString.match(/<svg\b[\s\S]*?>/i);
  if (openTag) {
    const fromTag = sizeFromOpenTag(openTag[0]);
    if (fromTag) {
      return fromTag;
    }
  }

  return FALLBACK_SVG_SIZE;
}

/**
 * Read page size from a live SVG root.
 * Root width/height are preferred: canonical sheets have no root viewBox
 * while nested logos do.
 */
export function readSvgRootSize(
  svgRoot: Pick<Element, 'getAttribute'>,
): SvgSize {
  const fromAttrs = sizeFromWidthHeight(
    svgRoot.getAttribute('width'),
    svgRoot.getAttribute('height'),
  );
  if (fromAttrs) {
    return fromAttrs;
  }

  const viewBox = svgRoot.getAttribute('viewBox');
  if (viewBox) {
    const parsed = parseViewBoxParts(viewBox);
    if (parsed) {
      return parsed;
    }
  }
  return FALLBACK_SVG_SIZE;
}

/**
 * Content size in user units (the drawn sheet before paper margins).
 * After addDocumentMargins the root viewBox is paper-sized with a negative
 * origin; recover the inner 576×756 / 559×806 content box from that origin.
 */
export function readSvgContentSize(svgRoot: SVGSVGElement): SvgSize {
  const viewBox = svgRoot.getAttribute('viewBox');
  if (viewBox) {
    const rect = parseViewBoxRect(viewBox);
    if (rect && rect.minX <= 0 && rect.minY <= 0) {
      const width = rect.width + 2 * rect.minX;
      const height = rect.height + 2 * rect.minY;
      if (isUsableSize(width, height)) {
        return { width, height };
      }
    }
  }
  return readSvgRootSize(svgRoot);
}

/** Centered footer translation below content, inside the paper margin. */
export function footerTranslateForRoot(svgRoot: SVGSVGElement): {
  x: number;
  y: number;
} {
  const content = readSvgContentSize(svgRoot);
  return {
    x: content.width / 2,
    y: content.height + FOOTER_MARGIN_OFFSET,
  };
}

/**
 * Scale content into a destination box without stretching or cropping.
 * Remaining space is letterboxed / pillarboxed.
 */
export function fitRect(
  contentWidth: number,
  contentHeight: number,
  boxWidth: number,
  boxHeight: number,
): FittedRect {
  const scale = Math.min(boxWidth / contentWidth, boxHeight / contentHeight);
  const destWidth = contentWidth * scale;
  const destHeight = contentHeight * scale;
  return {
    destWidth,
    destHeight,
    offsetX: (boxWidth - destWidth) / 2,
    offsetY: (boxHeight - destHeight) / 2,
  };
}
