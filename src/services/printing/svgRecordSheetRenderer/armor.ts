/**
 * Armor pip rendering utilities
 * Handles loading pre-made armor pip SVGs and generating dynamic pips for non-biped mechs
 */

import { IRecordSheetData } from '@/types/printing';
import { ArmorPipLayout } from '../ArmorPipLayout';
import {
  SVG_NS,
  PIPS_BASE_PATH,
  ARMOR_TEXT_IDS,
  LOCATION_TO_PIP_NAME,
  REAR_LOCATIONS,
  PREMADE_PIP_TYPES,
  ELEMENT_IDS,
  BIPED_PIP_GROUP_IDS,
  QUAD_PIP_GROUP_IDS,
  TRIPOD_PIP_GROUP_IDS,
} from './constants';
import { setTextContent } from './template';

/**
 * Fill template with armor pips and text values (async - fetches pip SVGs)
 */
export async function fillArmorPips(
  svgDoc: Document,
  svgRoot: SVGSVGElement,
  armor: IRecordSheetData['armor'],
  mechType?: string
): Promise<void> {
  // Fill armor text labels with armor point values
  armor.locations.forEach((loc) => {
    // Front armor
    const textId = ARMOR_TEXT_IDS[loc.abbreviation];
    if (textId) {
      setTextContent(svgDoc, textId, `( ${loc.current} )`);
    }

    // Rear armor for torso locations
    if (loc.rear !== undefined && loc.rear > 0) {
      const rearTextId = ARMOR_TEXT_IDS[`${loc.abbreviation}R`];
      if (rearTextId) {
        setTextContent(svgDoc, rearTextId, `( ${loc.rear} )`);
      }
    }
  });

  // Check if this mech type uses pre-made pip files
  const usePremadePips = PREMADE_PIP_TYPES.includes(mechType || 'biped');

  if (usePremadePips) {
    // Biped: Load pre-made pip SVG files
    let armorPipsGroup = svgDoc.getElementById(ELEMENT_IDS.CANON_ARMOR_PIPS);

    if (!armorPipsGroup) {
      armorPipsGroup = svgDoc.getElementById(ELEMENT_IDS.ARMOR_PIPS);
    }
    if (!armorPipsGroup) {
      console.warn('Could not find canonArmorPips or armorPips group in template');
      const rootGroup = svgDoc.createElementNS(SVG_NS, 'g');
      rootGroup.setAttribute('id', 'armor-pips-generated');
      rootGroup.setAttribute('transform', 'matrix(0.975,0,0,0.975,-390.621,-44.241)');
      svgRoot.appendChild(rootGroup);
      await loadAllArmorPips(svgDoc, rootGroup, armor);
      return;
    }

    await loadAllArmorPips(svgDoc, armorPipsGroup, armor);
  } else {
    // Non-biped (quad, tripod, etc.): Generate pips dynamically using template rects
    await generateDynamicArmorPips(svgDoc, armor, mechType || 'quad');
  }
}

/**
 * Load all armor pips into a parent group (for biped - pre-made SVG files)
 */
async function loadAllArmorPips(
  svgDoc: Document,
  parentGroup: Element,
  armor: IRecordSheetData['armor']
): Promise<void> {
  // Load pips for each armor location
  const pipPromises = armor.locations.map(async (loc) => {
    const pipName = LOCATION_TO_PIP_NAME[loc.abbreviation];
    if (!pipName) {
      console.warn(`Unknown location abbreviation: ${loc.abbreviation}`);
      return;
    }

    // Load front armor pips
    if (loc.current > 0) {
      await loadAndInsertPips(
        svgDoc,
        parentGroup,
        pipName,
        loc.current,
        false
      );
    }

    // Load rear armor pips if applicable
    if (loc.rear !== undefined && loc.rear > 0 && REAR_LOCATIONS.includes(loc.abbreviation)) {
      await loadAndInsertPips(
        svgDoc,
        parentGroup,
        pipName,
        loc.rear,
        true
      );
    }
  });

  await Promise.all(pipPromises);
}

/**
 * Load a pip SVG file and insert its paths into the template
 */
async function loadAndInsertPips(
  svgDoc: Document,
  parentGroup: Element,
  locationName: string,
  pipCount: number,
  isRear: boolean
): Promise<void> {
  // Build the pip file path
  // Format: Armor_<Location>_<Count>_Humanoid.svg or Armor_<Location>_R_<Count>_Humanoid.svg
  const rearSuffix = isRear ? '_R' : '';
  const pipFileName = `Armor_${locationName}${rearSuffix}_${pipCount}_Humanoid.svg`;
  const pipPath = `${PIPS_BASE_PATH}/${pipFileName}`;

  try {
    const response = await fetch(pipPath);
    if (!response.ok) {
      console.warn(`Pip file not found: ${pipPath}`);
      return;
    }

    const pipSvgText = await response.text();
    const parser = new DOMParser();
    const pipDoc = parser.parseFromString(pipSvgText, 'image/svg+xml');

    // Extract the path elements from the pip SVG
    // Pip files have paths inside <switch><g>...</g></switch>
    const paths = pipDoc.querySelectorAll('path');

    if (paths.length === 0) return;

    // Create a group for this location's pips
    // MegaMekLab imports pip paths directly - the parent's transform handles positioning
    // NO additional transform needed on location groups
    const locationGroup = svgDoc.createElementNS(SVG_NS, 'g');
    locationGroup.setAttribute('id', `pips_${locationName}${rearSuffix}`);
    locationGroup.setAttribute('class', 'armor-pips');

    // Clone each path into our template
    paths.forEach(path => {
      const clonedPath = svgDoc.importNode(path, true) as SVGPathElement;
      // Ensure the path styling is preserved
      if (!clonedPath.getAttribute('fill')) {
        clonedPath.setAttribute('fill', '#FFFFFF');
      }
      if (!clonedPath.getAttribute('stroke')) {
        clonedPath.setAttribute('stroke', '#000000');
      }
      locationGroup.appendChild(clonedPath);
    });

    parentGroup.appendChild(locationGroup);
  } catch (error) {
    console.warn(`Failed to load pip SVG: ${pipPath}`, error);
  }
}

/**
 * Generate dynamic armor pips for non-biped mechs (quad, tripod, LAM, quadvee)
 * Uses MegaMekLab's ArmorPipLayout algorithm for proper pip positioning
 */
async function generateDynamicArmorPips(
  svgDoc: Document,
  armor: IRecordSheetData['armor'],
  mechType: string
): Promise<void> {
  // Get the pip group IDs based on mech type
  const pipGroupIds = getPipGroupIdsForMechType(mechType);

  armor.locations.forEach((loc) => {
    // Find the group ID for this location
    const groupId = pipGroupIds[loc.abbreviation];
    if (!groupId) {
      console.warn(`No pip group ID for location: ${loc.abbreviation}`);
      return;
    }

    // Find the pip area element in the template
    const pipArea = svgDoc.getElementById(groupId);
    if (!pipArea) {
      console.warn(`Pip area not found: ${groupId}`);
      return;
    }

    // Use ArmorPipLayout to generate pips within the bounding rects
    if (loc.current > 0) {
      ArmorPipLayout.addPips(svgDoc, pipArea, loc.current, {
        fill: '#FFFFFF',
        strokeWidth: 0.5,
        className: 'pip armor',
      });
    }
  });

  // Handle rear armor
  armor.locations.forEach((loc) => {
    if (loc.rear !== undefined && loc.rear > 0 && REAR_LOCATIONS.includes(loc.abbreviation)) {
      const rearGroupId = pipGroupIds[`${loc.abbreviation}R`];
      if (rearGroupId) {
        const pipArea = svgDoc.getElementById(rearGroupId);
        if (pipArea && loc.rear > 0) {
          ArmorPipLayout.addPips(svgDoc, pipArea, loc.rear, {
            fill: '#FFFFFF',
            strokeWidth: 0.5,
            className: 'pip armor rear',
          });
        }
      }
    }
  });
}

/**
 * Get pip group IDs for a specific mech type
 */
function getPipGroupIdsForMechType(mechType: string): Record<string, string> {
  switch (mechType) {
    case 'quad':
      return QUAD_PIP_GROUP_IDS;
    case 'tripod':
      return TRIPOD_PIP_GROUP_IDS;
    case 'biped':
    default:
      return BIPED_PIP_GROUP_IDS;
  }
}
