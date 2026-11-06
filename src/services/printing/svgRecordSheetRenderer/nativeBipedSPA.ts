import type { ISPASectionData } from '../recordsheet/spaSection';

import { SVG_NS } from './constants';

/**
 * Single-pilot biped placement, not a new SPA resolver or crew-slot model.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/record-sheet-export/spec.md
 * MML 62bf193: PrintEntity.java:537-550; PrintRecordSheet.java:1084-1143.
 * Native overflow is deliberate parity: no clipping, cap or extra shrink.
 */
export function renderNativeBipedSPASection(
  svgDoc: Document,
  block: ISPASectionData,
): void {
  if (!block.hasContent || !block.entries.length) return;
  const region = svgDoc.getElementById('spas0');
  if (region?.localName !== 'rect' || !region.parentNode) return;

  const x = Number(region.getAttribute('x'));
  const y = Number(region.getAttribute('y'));
  const width = Number(region.getAttribute('width'));
  const height = Number(region.getAttribute('height'));
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('Could not measure native biped SPA text');

  // PrintRecordSheet.java:108,112,245-251: default face and normal/italic metrics.
  const fontFamily = 'Eurostile';
  const measure = (text: string, size: number, italic = false): number => {
    context.font = `${italic ? 'italic ' : ''}${size}px ${fontFamily}`;
    return context.measureText(text).width;
  };
  let remaining = `Abilities: ${block.entries.map((entry) => entry.headline).join(', ')}`;
  // Preserve the source's float arithmetic before double-precision line spacing.
  let fontSize = Math.fround(Math.fround(6.76) * Math.fround(0.9));
  if (measure(remaining, fontSize) > width) {
    fontSize = Math.fround(Math.fround(height) / Math.fround(2.4));
  }
  const lineHeight = fontSize * 1.2;
  let baseline = y + lineHeight;
  const group = svgDoc.createElementNS(SVG_NS, 'g');
  group.setAttribute('id', 'specialAbilitiesBlock');
  group.setAttribute('class', 'abilities');
  region.parentNode.appendChild(group);

  const append = (text: string): void => {
    const line = svgDoc.createElementNS(SVG_NS, 'text');
    for (const [name, value] of Object.entries({
      x,
      y: baseline,
      'font-family': fontFamily,
      'font-size': fontSize,
      'font-weight': 'normal',
      'font-style': 'italic',
      'text-anchor': 'start',
      fill: '#000000',
    }))
      line.setAttribute(name, String(value));
    line.textContent = text;
    group.appendChild(line);
    baseline += lineHeight;
  };

  // Literal delimiter algorithm: emitted lines retain the trailing space.
  // An overwide token without delimiters is emitted whole, exactly as upstream.
  let pos = 0;
  while (remaining.trim().length) {
    if (measure(remaining, fontSize, true) <= width) {
      append(remaining);
      return;
    }
    const index = remaining.substring(pos).indexOf(' ');
    if (index < 0 && pos === 0) {
      append(remaining);
      return;
    }
    const subText = remaining.substring(0, pos + index);
    if (index < 0 || (measure(subText, fontSize, true) > width && pos > 0)) {
      append(remaining.substring(0, pos));
      remaining = remaining.substring(pos);
      pos = 0;
    } else {
      pos += index + 1;
    }
  }
}
