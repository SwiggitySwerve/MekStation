/**
 * SVG Record Sheet — Special Abilities block renderer.
 *
 * Adds a printable "Special Abilities" block to the pilot panel of the
 * MegaMek-style SVG record sheet. Layout:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ SPECIAL ABILITIES                           │
 *   │ Cluster Hitter            +1 column on ...  │
 *   │ Weapon Specialist (Med    -2 to-hit with... │
 *   │ Iron Man                  Reduces consc...  │
 *   │ +N more                                     │
 *   └─────────────────────────────────────────────┘
 *
 * The MegaMek template doesn't pre-allocate space for this block, so we
 * inject SVG `<text>` nodes anchored to the bottom-left of the pilot
 * panel area. The block respects MAX_PRINTABLE_SPA_ENTRIES — additional
 * abilities are abbreviated with a "+N more" footer rather than
 * overflowing into the equipment table.
 *
 * @spec openspec/changes/add-spa-display-on-pilot-sheet-and-unit-card
 */

import {
  ISPASectionData,
  MAX_PRINTABLE_SPA_ENTRIES,
} from '@/services/printing/recordsheet/spaSection';

import { SVG_NS } from './constants';

// =============================================================================
// Layout constants
// =============================================================================

/** Anchor coordinates for the block (bottom of pilot panel area). */
const BLOCK_X = 360;
const BLOCK_Y = 690;
const BLOCK_WIDTH = 210;
const LINE_HEIGHT = 9;
const HEADER_FONT_SIZE = 8;
const ENTRY_FONT_SIZE = 7;

/** Approx. character width at the entry font size — used to truncate
 *  the headline + description so they don't bleed past the block edge. */
const APPROX_CHAR_WIDTH = 3.5;

// =============================================================================
// Renderer
// =============================================================================

/**
 * Render the Special Abilities block into `svgDoc`. Skips entirely when
 * the block has no entries — no header, no empty container.
 *
 * Returns the number of lines drawn (including header) so callers can
 * measure overflow if they need to.
 */
export function renderSPASection(
  svgDoc: Document,
  block: ISPASectionData,
): number {
  if (!block.hasContent) return 0;

  const root = svgDoc.documentElement;

  // Group container — keeps the block easy to remove for re-renders.
  const group = svgDoc.createElementNS(SVG_NS, 'g');
  group.setAttribute('id', 'specialAbilitiesBlock');
  group.setAttribute(
    'font-family',
    'Eurostile, "Century Gothic", "Trebuchet MS", Arial, sans-serif',
  );

  // Header
  const header = svgDoc.createElementNS(SVG_NS, 'text');
  header.setAttribute('x', String(BLOCK_X));
  header.setAttribute('y', String(BLOCK_Y));
  header.setAttribute('font-size', String(HEADER_FONT_SIZE));
  header.setAttribute('font-weight', 'bold');
  header.textContent = 'SPECIAL ABILITIES';
  group.appendChild(header);

  // Entries — capped at MAX_PRINTABLE_SPA_ENTRIES; remainder summarised.
  const printable = block.entries.slice(0, MAX_PRINTABLE_SPA_ENTRIES);
  const overflow = block.entries.length - printable.length;
  const maxChars = Math.floor(BLOCK_WIDTH / APPROX_CHAR_WIDTH);

  printable.forEach((entry, i) => {
    const line = svgDoc.createElementNS(SVG_NS, 'text');
    line.setAttribute('x', String(BLOCK_X));
    line.setAttribute('y', String(BLOCK_Y + LINE_HEIGHT * (i + 1)));
    line.setAttribute('font-size', String(ENTRY_FONT_SIZE));

    // Headline + dash + description on a single line. Truncate to fit
    // the block width — the helper already trims to ~60 chars but we
    // hard-cap here to defend against unusually wide labels.
    const composed = `${entry.headline} — ${entry.truncatedDescription}`;
    line.textContent =
      composed.length > maxChars
        ? composed.slice(0, maxChars - 1).trimEnd() + '\u2026'
        : composed;
    group.appendChild(line);
  });

  if (overflow > 0) {
    const more = svgDoc.createElementNS(SVG_NS, 'text');
    more.setAttribute('x', String(BLOCK_X));
    more.setAttribute(
      'y',
      String(BLOCK_Y + LINE_HEIGHT * (printable.length + 1)),
    );
    more.setAttribute('font-size', String(ENTRY_FONT_SIZE));
    more.setAttribute('font-style', 'italic');
    more.textContent = `+${overflow} more`;
    group.appendChild(more);
  }

  root.appendChild(group);
  return printable.length + (overflow > 0 ? 2 : 1);
}

// =============================================================================
// String-builder variant
// =============================================================================

/** Layout constants for the string-builder variant — non-mech renderers
 *  build SVG as flat strings rather than via `Document` nodes. We anchor
 *  the block to a configurable origin so each per-type renderer can drop
 *  it into whatever empty real-estate the sheet has left. Defaults match
 *  the MegaMek pilot-panel coordinates in `renderSPASection`. */
const STRING_VARIANT_FONT_FAMILY =
  'Eurostile, "Century Gothic", "Trebuchet MS", Arial, sans-serif';

/**
 * Escape minimal XML special characters for embedding inside an SVG
 * `<text>` node. Matches the per-renderer `esc()` helpers; defined here
 * so this module stays self-contained.
 */
function escapeForSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface IBuildSPASectionStringOptions {
  /** Top-left X coordinate of the block. Defaults to {@link BLOCK_X}. */
  readonly x?: number;
  /** Top-left Y coordinate of the block. Defaults to {@link BLOCK_Y}. */
  readonly y?: number;
  /** Block width — drives single-line truncation. Defaults to {@link BLOCK_WIDTH}. */
  readonly width?: number;
}

/**
 * Render the Special Abilities block as an SVG fragment string. Returns
 * an empty string when the block has no entries — callers can splat the
 * result into their `body` template without conditional wrapping.
 *
 * Mirrors {@link renderSPASection}'s layout (header + capped entries +
 * "+N more" overflow) so per-type renderers stay visually consistent
 * with the mech sheet's pilot panel.
 */
export function buildSPASectionString(
  block: ISPASectionData,
  options: IBuildSPASectionStringOptions = {},
): string {
  if (!block.hasContent) return '';

  const x = options.x ?? BLOCK_X;
  const y = options.y ?? BLOCK_Y;
  const width = options.width ?? BLOCK_WIDTH;

  const printable = block.entries.slice(0, MAX_PRINTABLE_SPA_ENTRIES);
  const overflow = block.entries.length - printable.length;
  const maxChars = Math.floor(width / APPROX_CHAR_WIDTH);

  const parts: string[] = [];
  parts.push(
    `<g id="specialAbilitiesBlock" font-family='${STRING_VARIANT_FONT_FAMILY}'>`,
  );
  parts.push(
    `<text x="${x}" y="${y}" font-size="${HEADER_FONT_SIZE}" font-weight="bold">SPECIAL ABILITIES</text>`,
  );

  printable.forEach((entry, i) => {
    const composed = `${entry.headline} — ${entry.truncatedDescription}`;
    const text =
      composed.length > maxChars
        ? composed.slice(0, maxChars - 1).trimEnd() + '…'
        : composed;
    parts.push(
      `<text x="${x}" y="${y + LINE_HEIGHT * (i + 1)}" font-size="${ENTRY_FONT_SIZE}">${escapeForSvgText(text)}</text>`,
    );
  });

  if (overflow > 0) {
    parts.push(
      `<text x="${x}" y="${y + LINE_HEIGHT * (printable.length + 1)}" font-size="${ENTRY_FONT_SIZE}" font-style="italic">+${overflow} more</text>`,
    );
  }

  parts.push('</g>');
  return parts.join('\n');
}
