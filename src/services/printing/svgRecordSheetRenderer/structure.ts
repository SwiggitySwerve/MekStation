/**
 * Structure pip rendering utilities
 * Handles loading pre-made structure pip SVGs and generating dynamic pips for non-biped mechs
 */

import { IRecordSheetData, ILocationStructure } from '@/types/printing';
import { logger } from '@/utils/logger';

import { ArmorPipLayout } from '../ArmorPipLayout';
import {
  SVG_NS,
  PIPS_BASE_PATH,
  STRUCTURE_TEXT_IDS,
  PREMADE_PIP_TYPES,
  ELEMENT_IDS,
  STRUCTURE_PIP_GROUP_IDS,
  BIPED_STRUCTURE_PIP_GROUP_IDS,
  QUAD_STRUCTURE_PIP_GROUP_IDS,
  TRIPOD_STRUCTURE_PIP_GROUP_IDS,
} from './constants';
import { setTextContent } from './template';

/**
 * Fill template with structure pips and text values
 * For biped: Loads pre-made structure pip SVG files (BipedIS{tonnage}_{location}.svg)
 * For non-biped: Generates pips dynamically using template bounding rects
 */
export async function fillStructurePips(
  svgDoc: Document,
  svgRoot: SVGSVGElement,
  structure: IRecordSheetData['structure'],
  tonnage: number,
  mechType?: string,
): Promise<void> {
  // Fill text labels with structure point values
  structure.locations.forEach((loc) => {
    const textId = STRUCTURE_TEXT_IDS[loc.abbreviation];
    if (textId) {
      setTextContent(svgDoc, textId, `( ${loc.points} )`);
    }
  });

  // Check if this mech type uses pre-made pip files
  const usePremadePips = PREMADE_PIP_TYPES.includes(mechType || 'biped');

  if (usePremadePips) {
    // Biped: Load pre-made structure pip SVG files
    let structurePipsGroup: Element | null = svgDoc.getElementById(
      ELEMENT_IDS.CANON_STRUCTURE_PIPS,
    );

    if (!structurePipsGroup) {
      const templatePips = svgDoc.getElementById(ELEMENT_IDS.STRUCTURE_PIPS);
      if (templatePips) {
        templatePips.setAttribute('visibility', 'hidden');
      }

      const newGroup = svgDoc.createElementNS(SVG_NS, 'g');
      newGroup.setAttribute('id', 'structure-pips-loaded');
      newGroup.setAttribute(
        'transform',
        'matrix(0.971,0,0,0.971,-378.511,-376.966)',
      );
      svgRoot.appendChild(newGroup);
      structurePipsGroup = newGroup;
    }

    await loadAllStructurePips(
      svgDoc,
      structurePipsGroup,
      structure.locations,
      tonnage,
    );
  } else {
    // Non-biped (quad, tripod, etc.): Generate pips dynamically using template rects
    generateDynamicStructurePips(svgDoc, structure, mechType || 'quad');
  }
}

/**
 * Load all structure pips into a parent group
 */
async function loadAllStructurePips(
  svgDoc: Document,
  parentGroup: Element,
  locations: readonly ILocationStructure[],
  tonnage: number,
): Promise<void> {
  const pipPromises = locations.map(async (loc) => {
    await loadAndInsertStructurePips(
      svgDoc,
      parentGroup,
      loc.abbreviation,
      tonnage,
    );
  });

  await Promise.all(pipPromises);
}

/**
 * Load a structure pip SVG file and insert its paths into the template
 * Structure pip files are named: BipedIS{tonnage}_{location}.svg
 */
async function loadAndInsertStructurePips(
  svgDoc: Document,
  parentGroup: Element,
  locationAbbr: string,
  tonnage: number,
): Promise<void> {
  // Build the pip file path: BipedIS50_CT.svg, BipedIS50_HD.svg, etc.
  const pipFileName = `BipedIS${tonnage}_${locationAbbr}.svg`;
  const pipPath = `${PIPS_BASE_PATH}/${pipFileName}`;

  try {
    const response = await fetch(pipPath);
    if (!response.ok) {
      logger.warn(`Structure pip file not found: ${pipPath}`);
      return;
    }

    const pipSvgText = await response.text();
    const parser = new DOMParser();
    const pipDoc = parser.parseFromString(pipSvgText, 'image/svg+xml');

    // Extract the path elements from the pip SVG
    const paths = pipDoc.querySelectorAll('path');

    if (paths.length === 0) return;

    // Create a group for this location's structure pips
    const locationGroup = svgDoc.createElementNS(SVG_NS, 'g');
    locationGroup.setAttribute('id', `is_pips_${locationAbbr}`);
    locationGroup.setAttribute('class', 'structure-pips');

    // Clone each path into our template
    paths.forEach((path) => {
      const clonedPath = svgDoc.importNode(path, true) as SVGPathElement;
      // Ensure proper styling for structure pips (white fill with black stroke)
      if (
        !clonedPath.getAttribute('fill') ||
        clonedPath.getAttribute('fill') === 'none'
      ) {
        clonedPath.setAttribute('fill', '#FFFFFF');
      }
      if (!clonedPath.getAttribute('stroke')) {
        clonedPath.setAttribute('stroke', '#000000');
      }
      locationGroup.appendChild(clonedPath);
    });

    parentGroup.appendChild(locationGroup);
  } catch (error) {
    logger.warn(`Failed to load structure pip SVG: ${pipPath}`, error);
  }
}

/**
 * DEPRECATED: Generate structure pip circles for a location
 * Kept as fallback if external pip files are not available
 */
export function generateStructurePipsForLocationFallback(
  svgDoc: Document,
  parentGroup: Element,
  location: ILocationStructure,
): void {
  const pipGroupId = STRUCTURE_PIP_GROUP_IDS[location.abbreviation];
  if (!pipGroupId) return;

  // Find the existing pip group to get positioning reference
  const existingPipGroup = svgDoc.getElementById(pipGroupId);
  if (!existingPipGroup) {
    logger.warn(`Structure pip group not found: ${pipGroupId}`);
    return;
  }

  // Get all existing pip paths in this group to determine positions
  const existingPips = existingPipGroup.querySelectorAll(
    'path.pip.structure, circle.pip.structure',
  );

  // If there are existing pips, we can use them as templates
  // Otherwise, generate pips in a grid layout within the group
  if (existingPips.length > 0) {
    // Show only the number of pips we need (up to existing count)
    const pipsToShow = Math.min(location.points, existingPips.length);

    // The template already has the pips positioned - we just need to ensure
    // the correct number are visible and styled
    for (let i = 0; i < existingPips.length; i++) {
      const pip = existingPips[i] as SVGElement;
      if (i < pipsToShow) {
        // Show this pip with proper styling
        pip.setAttribute('fill', '#FFFFFF');
        pip.setAttribute('visibility', 'visible');
      } else {
        // Hide excess pips
        pip.setAttribute('visibility', 'hidden');
      }
    }

    // If we need more pips than exist in template, generate additional ones
    if (location.points > existingPips.length) {
      generateAdditionalStructurePips(
        svgDoc,
        existingPipGroup,
        location.points - existingPips.length,
        existingPips[existingPips.length - 1] as SVGElement,
      );
    }
  } else {
    // No existing pips - generate from scratch
    // Get the group's transform to determine position
    generateStructurePipGrid(
      svgDoc,
      existingPipGroup,
      location.points,
      location.abbreviation,
    );
  }
}

/**
 * Generate additional structure pips beyond what the template provides
 */
function generateAdditionalStructurePips(
  svgDoc: Document,
  parentGroup: Element,
  count: number,
  referencePip: SVGElement,
): void {
  if (count <= 0) return;

  // Get position from reference pip's parent transform
  const parentG = referencePip.parentElement;
  if (!parentG) return;

  const transform = parentG.getAttribute('transform') || '';
  const translateMatch = transform.match(/translate\(([\d.-]+),([\d.-]+)\)/);

  if (!translateMatch) return;

  const baseX = parseFloat(translateMatch[1]);
  const baseY = parseFloat(translateMatch[2]);

  // Pip radius (based on template pips)
  const radius = 1.75;
  const spacing = 5;

  // Generate additional pips in a row/column pattern
  for (let i = 0; i < count; i++) {
    const pipGroup = svgDoc.createElementNS(SVG_NS, 'g');
    pipGroup.setAttribute(
      'transform',
      `translate(${baseX + (i + 1) * spacing},${baseY})`,
    );

    const pip = svgDoc.createElementNS(SVG_NS, 'circle');
    pip.setAttribute('cx', '0');
    pip.setAttribute('cy', '0');
    pip.setAttribute('r', String(radius));
    pip.setAttribute('fill', '#FFFFFF');
    pip.setAttribute('stroke', '#000000');
    pip.setAttribute('stroke-width', '0.5');
    pip.setAttribute('class', 'pip structure');

    pipGroup.appendChild(pip);
    parentGroup.appendChild(pipGroup);
  }
}

/**
 * Generate a grid of structure pips when no template pips exist
 */
function generateStructurePipGrid(
  svgDoc: Document,
  parentGroup: Element,
  count: number,
  locationAbbr: string,
): void {
  if (count <= 0) return;

  // Pip layout configuration based on location
  const layouts: Record<
    string,
    { cols: number; startX: number; startY: number }
  > = {
    HD: { cols: 3, startX: 0, startY: 0 },
    CT: { cols: 5, startX: 0, startY: 0 },
    LT: { cols: 4, startX: 0, startY: 0 },
    RT: { cols: 4, startX: 0, startY: 0 },
    LA: { cols: 3, startX: 0, startY: 0 },
    RA: { cols: 3, startX: 0, startY: 0 },
    LL: { cols: 3, startX: 0, startY: 0 },
    RL: { cols: 3, startX: 0, startY: 0 },
  };

  const layout = layouts[locationAbbr] || { cols: 4, startX: 0, startY: 0 };
  const radius = 1.75;
  const spacing = 4.5;

  const group = svgDoc.createElementNS(SVG_NS, 'g');
  group.setAttribute('id', `gen_is_pips_${locationAbbr}`);
  group.setAttribute('class', 'structure-pips-generated');

  for (let i = 0; i < count; i++) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);

    const pip = svgDoc.createElementNS(SVG_NS, 'circle');
    pip.setAttribute('cx', String(layout.startX + col * spacing));
    pip.setAttribute('cy', String(layout.startY + row * spacing));
    pip.setAttribute('r', String(radius));
    pip.setAttribute('fill', '#FFFFFF');
    pip.setAttribute('stroke', '#000000');
    pip.setAttribute('stroke-width', '0.5');
    pip.setAttribute('class', 'pip structure');

    group.appendChild(pip);
  }

  parentGroup.appendChild(group);
}

/**
 * Generate structure pips for non-biped mechs (quad, tripod, LAM, quadvee)
 * Uses MegaMekLab's ArmorPipLayout algorithm for proper pip positioning
 */
function generateDynamicStructurePips(
  svgDoc: Document,
  structure: IRecordSheetData['structure'],
  mechType: string,
): void {
  // Get the structure pip group IDs based on mech type
  const pipGroupIds = getStructurePipGroupIdsForMechType(mechType);

  structure.locations.forEach((loc) => {
    // Find the group ID for this location
    const groupId = pipGroupIds[loc.abbreviation];
    if (!groupId) {
      logger.warn(
        `No structure pip group ID for location: ${loc.abbreviation}`,
      );
      return;
    }

    // Find the pip area element in the template
    const pipArea = svgDoc.getElementById(groupId);
    if (!pipArea) {
      logger.warn(`Structure pip area not found: ${groupId}`);
      return;
    }

    // Use ArmorPipLayout to generate pips within the bounding rects
    if (loc.points > 0) {
      ArmorPipLayout.addPips(svgDoc, pipArea, loc.points, {
        fill: '#FFFFFF',
        strokeWidth: 0.5,
        className: 'pip structure',
      });
    }
  });
}

/**
 * Get structure pip group IDs for a specific mech type
 */
function getStructurePipGroupIdsForMechType(
  mechType: string,
): Record<string, string> {
  switch (mechType) {
    case 'quad':
      return QUAD_STRUCTURE_PIP_GROUP_IDS;
    case 'tripod':
      return TRIPOD_STRUCTURE_PIP_GROUP_IDS;
    case 'biped':
    default:
      return BIPED_STRUCTURE_PIP_GROUP_IDS;
  }
}
