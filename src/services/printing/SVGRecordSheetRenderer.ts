/**
 * SVG Record Sheet Renderer
 * 
 * Renders record sheets using MegaMek SVG templates.
 * Fills in template placeholders with unit data and loads armor/structure pips.
 * 
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import { 
  IRecordSheetData,
  ILocationStructure,
  IRecordSheetEquipment,
  ILocationCriticals,
  IRecordSheetCriticalSlot,
  PREVIEW_DPI_MULTIPLIER,
} from '@/types/printing';
import { ArmorPipLayout } from './ArmorPipLayout';

// =============================================================================
// Constants (matching MegaMek template element IDs)
// =============================================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

// Base path for pip SVG files
const PIPS_BASE_PATH = '/record-sheets/biped_pips';

// MegaMek template element IDs
const ELEMENT_IDS = {
  // 'MECH DATA section
  TYPE: 'type',
  TONNAGE: 'tonnage',
  TECH_BASE: 'techBase',
  RULES_LEVEL: 'rulesLevel',
  ROLE: 'role',
  ENGINE_TYPE: 'engineType',
  
  // Movement section
  WALK_MP: 'mpWalk',
  RUN_MP: 'mpRun', 
  JUMP_MP: 'mpJump',
  
  // Equipment/Inventory area
  INVENTORY: 'inventory',
  
  // Battle value
  BV: 'bv',
  
  // Armor
  ARMOR_TYPE: 'armorType',
  STRUCTURE_TYPE: 'structureType',
  CANON_ARMOR_PIPS: 'canonArmorPips',
  ARMOR_PIPS: 'armorPips',
  
  // Structure (Internal Structure)
  CANON_STRUCTURE_PIPS: 'canonStructurePips',
  STRUCTURE_PIPS: 'structurePips',
  
  // Warrior data
  PILOT_NAME: 'pilotName0',
  GUNNERY_SKILL: 'gunnerySkill0',
  PILOTING_SKILL: 'pilotingSkill0',
  
  // Heat
  HEAT_SINK_TYPE: 'hsType',
  HEAT_SINK_COUNT: 'hsCount',
} as const;

// Armor text label IDs (for displaying armor point values around the diagram)
const ARMOR_TEXT_IDS: Record<string, string> = {
  'HD': 'textArmor_HD',
  'CT': 'textArmor_CT',
  'CTR': 'textArmor_CTR',  // Center Torso Rear
  'LT': 'textArmor_LT',
  'LTR': 'textArmor_LTR',  // Left Torso Rear
  'RT': 'textArmor_RT',
  'RTR': 'textArmor_RTR',  // Right Torso Rear
  'LA': 'textArmor_LA',
  'RA': 'textArmor_RA',
  'LL': 'textArmor_LL',
  'RL': 'textArmor_RL',
  // Quad leg locations
  'FLL': 'textArmor_FLL',
  'FRL': 'textArmor_FRL',
  'RLL': 'textArmor_RLL',
  'RRL': 'textArmor_RRL',
  // Tripod center leg
  'CL': 'textArmor_CL',
};

// Structure text label IDs (for displaying IS point values)
// Note: Head (HD) doesn't have a text element in the template - it's always 3 IS points
const STRUCTURE_TEXT_IDS: Record<string, string> = {
  'CT': 'textIS_CT',
  'LT': 'textIS_LT',
  'RT': 'textIS_RT',
  'LA': 'textIS_LA',
  'RA': 'textIS_RA',
  'LL': 'textIS_LL',
  'RL': 'textIS_RL',
  // Quad leg locations
  'FLL': 'textIS_FLL',
  'FRL': 'textIS_FRL',
  'RLL': 'textIS_RLL',
  'RRL': 'textIS_RRL',
  // Tripod center leg
  'CL': 'textIS_CL',
};

// Structure pip group IDs (embedded pip templates in SVG) - Biped
const BIPED_STRUCTURE_PIP_GROUP_IDS: Record<string, string> = {
  'HD': 'isPipsHD',
  'CT': 'isPipsCT',
  'LT': 'isPipsLT',
  'RT': 'isPipsRT',
  'LA': 'isPipsLA',
  'RA': 'isPipsRA',
  'LL': 'isPipsLL',
  'RL': 'isPipsRL',
};

// Structure pip group IDs for Quad mechs
const QUAD_STRUCTURE_PIP_GROUP_IDS: Record<string, string> = {
  'HD': 'isPipsHD',
  'CT': 'isPipsCT',
  'LT': 'isPipsLT',
  'RT': 'isPipsRT',
  'FLL': 'isPipsFLL',
  'FRL': 'isPipsFRL',
  'RLL': 'isPipsRLL',
  'RRL': 'isPipsRRL',
};

// Structure pip group IDs for Tripod mechs
const TRIPOD_STRUCTURE_PIP_GROUP_IDS: Record<string, string> = {
  'HD': 'isPipsHD',
  'CT': 'isPipsCT',
  'LT': 'isPipsLT',
  'RT': 'isPipsRT',
  'LA': 'isPipsLA',
  'RA': 'isPipsRA',
  'LL': 'isPipsLL',
  'RL': 'isPipsRL',
  'CL': 'isPipsCL', // Center Leg (tripod-specific)
};

// Legacy alias for backward compatibility
const STRUCTURE_PIP_GROUP_IDS = BIPED_STRUCTURE_PIP_GROUP_IDS;

// Map from our location abbreviations to MegaMek pip file location names (for biped)
const LOCATION_TO_PIP_NAME: Record<string, string> = {
  'HD': 'Head',
  'CT': 'CT',
  'LT': 'LT',
  'RT': 'RT',
  'LA': 'LArm',
  'RA': 'RArm',
  'LL': 'LLeg',
  'RL': 'RLeg',
};

// Map from location abbreviations to template group IDs for armor pips
// These IDs match the armorPipsXX groups in mm-data templates

// Biped armor pip group IDs
const BIPED_PIP_GROUP_IDS: Record<string, string> = {
  'HD': 'armorPipsHD',
  'CT': 'armorPipsCT',
  'LT': 'armorPipsLT',
  'RT': 'armorPipsRT',
  'LA': 'armorPipsLA',
  'RA': 'armorPipsRA',
  'LL': 'armorPipsLL',
  'RL': 'armorPipsRL',
  // Rear
  'CTR': 'armorPipsCTR',
  'LTR': 'armorPipsLTR',
  'RTR': 'armorPipsRTR',
};

// Quad armor pip group IDs
const QUAD_PIP_GROUP_IDS: Record<string, string> = {
  'HD': 'armorPipsHD',
  'CT': 'armorPipsCT',
  'LT': 'armorPipsLT',
  'RT': 'armorPipsRT',
  'FLL': 'armorPipsFLL',
  'FRL': 'armorPipsFRL',
  'RLL': 'armorPipsRLL',
  'RRL': 'armorPipsRRL',
  // Rear
  'CTR': 'armorPipsCTR',
  'LTR': 'armorPipsLTR',
  'RTR': 'armorPipsRTR',
};

// Tripod armor pip group IDs
const TRIPOD_PIP_GROUP_IDS: Record<string, string> = {
  'HD': 'armorPipsHD',
  'CT': 'armorPipsCT',
  'LT': 'armorPipsLT',
  'RT': 'armorPipsRT',
  'LA': 'armorPipsLA',
  'RA': 'armorPipsRA',
  'LL': 'armorPipsLL',
  'RL': 'armorPipsRL',
  'CL': 'armorPipsCL', // Center Leg (tripod-specific)
  // Rear
  'CTR': 'armorPipsCTR',
  'LTR': 'armorPipsLTR',
  'RTR': 'armorPipsRTR',
};

// Rear armor locations
const REAR_LOCATIONS = ['CT', 'LT', 'RT'];

// Mech types that use pre-made pip files (DEPRECATED - all now use ArmorPipLayout)
// Keeping for backward compatibility but now using dynamic generation for all types
const PREMADE_PIP_TYPES: string[] = [];

// =============================================================================
// SVG Record Sheet Renderer
// =============================================================================

export class SVGRecordSheetRenderer {
  private svgDoc: Document | null = null;
  private svgRoot: SVGSVGElement | null = null;

  /**
   * Load the SVG template
   */
  async loadTemplate(templatePath: string): Promise<void> {
    const response = await fetch(templatePath);
    const svgText = await response.text();
    
    const parser = new DOMParser();
    this.svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    
    // Check for parse errors first
    const parseError = this.svgDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`Failed to parse SVG template: ${parseError.textContent}`);
    }
    
    // Verify documentElement is an SVG element
    const docElement = this.svgDoc.documentElement;
    if (
      docElement.tagName === 'svg' &&
      docElement.namespaceURI === SVG_NS &&
      docElement instanceof SVGSVGElement
    ) {
      this.svgRoot = docElement;
    } else {
      throw new Error('SVG template root element is not a valid SVGSVGElement');
    }
    
    // Add margins around the document
    this.addDocumentMargins();
  }

  /**
   * Add margins around the SVG document for proper spacing on all edges
   * The original template is 576x756, we expand to 612x792 (US Letter) with centered content
   */
  private addDocumentMargins(): void {
    if (!this.svgRoot) return;
    
    // Original template dimensions
    const originalWidth = 576;
    const originalHeight = 756;
    
    // Target dimensions (US Letter in points: 612x792)
    const targetWidth = 612;
    const targetHeight = 792;
    
    // Calculate margins (centered)
    const marginX = (targetWidth - originalWidth) / 2; // 18 points each side
    const marginY = (targetHeight - originalHeight) / 2; // 18 points top and bottom
    
    // Set viewBox to add margins: negative offset positions content with margins
    // viewBox = "minX minY width height"
    this.svgRoot.setAttribute('viewBox', `${-marginX} ${-marginY} ${targetWidth} ${targetHeight}`);
    
    // Update width/height to target size
    this.svgRoot.setAttribute('width', String(targetWidth));
    this.svgRoot.setAttribute('height', String(targetHeight));
  }

  /**
   * Fill the template with unit data (sync parts only)
   */
  fillTemplate(data: IRecordSheetData): void {
    if (!this.svgDoc || !this.svgRoot) {
      throw new Error('Template not loaded. Call loadTemplate first.');
    }

    // === 'MECH DATA Section ===
    this.setTextContent(ELEMENT_IDS.TYPE, `${data.header.chassis} ${data.header.model}`);
    this.setTextContent(ELEMENT_IDS.TONNAGE, String(data.header.tonnage));
    this.setTextContent(ELEMENT_IDS.TECH_BASE, data.header.techBase);
    this.setTextContent(ELEMENT_IDS.RULES_LEVEL, data.header.rulesLevel);
    this.setTextContent(ELEMENT_IDS.ROLE, 'Juggernaut');
    
    const engineRating = data.header.tonnage * data.movement.walkMP;
    this.setTextContent(ELEMENT_IDS.ENGINE_TYPE, `${engineRating} XL`);

    // === Movement ===
    this.setTextContent(ELEMENT_IDS.WALK_MP, String(data.movement.walkMP));
    this.setTextContent(ELEMENT_IDS.RUN_MP, String(data.movement.runMP));
    this.setTextContent(ELEMENT_IDS.JUMP_MP, String(data.movement.jumpMP));

    // === Battle Value ===
    this.setTextContent(ELEMENT_IDS.BV, data.header.battleValue.toLocaleString());

    // === Armor & Structure Types ===
    this.setTextContent(ELEMENT_IDS.ARMOR_TYPE, data.armor.type);
    this.setTextContent(ELEMENT_IDS.STRUCTURE_TYPE, data.structure.type);

    // === Heat Sinks ===
    this.setTextContent(ELEMENT_IDS.HEAT_SINK_TYPE, data.heatSinks.type);
    this.setTextContent(ELEMENT_IDS.HEAT_SINK_COUNT, `${data.heatSinks.count}`);

    // === Warrior Data (blank for tabletop) ===
    this.setTextContent(ELEMENT_IDS.PILOT_NAME, '');
    this.setTextContent(ELEMENT_IDS.GUNNERY_SKILL, '');
    this.setTextContent(ELEMENT_IDS.PILOTING_SKILL, '');

    // === Copyright Year ===
    this.fixCopyrightYear();

    // === Hide second crew damage panel (for single-pilot mechs) ===
    this.hideSecondCrewPanel();

    // === Render dynamic content ===
    this.renderEquipmentTable(data.equipment);
    this.renderCriticalSlots(data.criticals);
  }

  /**
   * Hide the second crew damage panel (crewDamage1) for single-pilot mechs
   * The template has two crew panels for dual-cockpit mechs, but most mechs only have one pilot
   */
  private hideSecondCrewPanel(): void {
    if (!this.svgDoc) return;
    
    const crewDamage1 = this.svgDoc.getElementById('crewDamage1');
    if (crewDamage1) {
      crewDamage1.setAttribute('visibility', 'hidden');
    }
  }

  /**
   * Fix the copyright text: replace year placeholder, set font, and adjust spacing
   * Matches MegaMekLab's style: Eurostile bold font, centered at bottom
   */
  private fixCopyrightYear(): void {
    if (!this.svgDoc) return;
    
    // Get the footer parent element to adjust font and position
    const footerElement = this.svgDoc.getElementById('footer');
    if (footerElement) {
      // Use Eurostile (MegaMekLab's font) with web-safe fallbacks
      footerElement.setAttribute('font-family', 'Eurostile, "Century Gothic", "Trebuchet MS", Arial, sans-serif');
      footerElement.setAttribute('font-size', '7.5px');
      footerElement.setAttribute('font-weight', 'bold');
      // Position near bottom with margin space (content area ends at 756, margin adds 18 more)
      footerElement.setAttribute('transform', 'translate(288.0 762.0)');
    }
    
    const copyrightElement = this.svgDoc.getElementById('tspanCopyright');
    if (copyrightElement && copyrightElement.textContent) {
      const currentYear = new Date().getFullYear();
      copyrightElement.textContent = copyrightElement.textContent.replace('%d', String(currentYear));
      // Remove textLength and lengthAdjust to prevent text stretching/distortion
      copyrightElement.removeAttribute('textLength');
      copyrightElement.removeAttribute('lengthAdjust');
      // Position first line above second line (adjusted for larger font)
      copyrightElement.setAttribute('y', '-9.0');
    }
    
    // Also fix the second line of copyright (Catalyst Game Labs)
    const catalystElement = this.svgDoc.getElementById('tspan221');
    if (catalystElement) {
      catalystElement.removeAttribute('textLength');
      catalystElement.removeAttribute('lengthAdjust');
      // Second line at baseline
      catalystElement.setAttribute('y', '0');
    }
  }

  /**
   * Fill template with armor pips and text values (async - fetches pip SVGs)
   */
  async fillArmorPips(armor: IRecordSheetData['armor'], mechType?: string): Promise<void> {
    if (!this.svgDoc || !this.svgRoot) {
      throw new Error('Template not loaded');
    }

    // Fill armor text labels with armor point values
    armor.locations.forEach((loc) => {
      // Front armor
      const textId = ARMOR_TEXT_IDS[loc.abbreviation];
      if (textId) {
        this.setTextContent(textId, `( ${loc.current} )`);
      }
      
      // Rear armor for torso locations
      if (loc.rear !== undefined && loc.rear > 0) {
        const rearTextId = ARMOR_TEXT_IDS[`${loc.abbreviation}R`];
        if (rearTextId) {
          this.setTextContent(rearTextId, `( ${loc.rear} )`);
        }
      }
    });

    // Check if this mech type uses pre-made pip files
    const usePremadePips = PREMADE_PIP_TYPES.includes(mechType || 'biped');

    if (usePremadePips) {
      // Biped: Load pre-made pip SVG files
    let armorPipsGroup = this.svgDoc.getElementById(ELEMENT_IDS.CANON_ARMOR_PIPS);
    
    if (!armorPipsGroup) {
      armorPipsGroup = this.svgDoc.getElementById(ELEMENT_IDS.ARMOR_PIPS);
    }
    if (!armorPipsGroup) {
      console.warn('Could not find canonArmorPips or armorPips group in template');
      const rootGroup = this.svgDoc.createElementNS(SVG_NS, 'g');
      rootGroup.setAttribute('id', 'armor-pips-generated');
      rootGroup.setAttribute('transform', 'matrix(0.975,0,0,0.975,-390.621,-44.241)');
      this.svgRoot.appendChild(rootGroup);
      await this.loadAllArmorPips(rootGroup, armor);
      return;
    }

    await this.loadAllArmorPips(armorPipsGroup, armor);
    } else {
      // Non-biped (quad, tripod, etc.): Generate pips dynamically using template rects
      await this.generateDynamicArmorPips(armor, mechType || 'quad');
    }
  }

  /**
   * Fill template with structure pips and text values
   * For biped: Loads pre-made structure pip SVG files (BipedIS{tonnage}_{location}.svg)
   * For non-biped: Generates pips dynamically using template bounding rects
   */
  async fillStructurePips(
    structure: IRecordSheetData['structure'],
    tonnage: number,
    mechType?: string
  ): Promise<void> {
    if (!this.svgDoc || !this.svgRoot) {
      throw new Error('Template not loaded');
    }

    // Fill text labels with structure point values
    structure.locations.forEach((loc) => {
      const textId = STRUCTURE_TEXT_IDS[loc.abbreviation];
      if (textId) {
        this.setTextContent(textId, `( ${loc.points} )`);
      }
    });

    // Check if this mech type uses pre-made pip files
    const usePremadePips = PREMADE_PIP_TYPES.includes(mechType || 'biped');

    if (usePremadePips) {
      // Biped: Load pre-made structure pip SVG files
    let structurePipsGroup: Element | null = this.svgDoc.getElementById(ELEMENT_IDS.CANON_STRUCTURE_PIPS);
    
    if (!structurePipsGroup) {
      const templatePips = this.svgDoc.getElementById(ELEMENT_IDS.STRUCTURE_PIPS);
      if (templatePips) {
        templatePips.setAttribute('visibility', 'hidden');
      }
      
      const newGroup = this.svgDoc.createElementNS(SVG_NS, 'g');
      newGroup.setAttribute('id', 'structure-pips-loaded');
      newGroup.setAttribute('transform', 'matrix(0.971,0,0,0.971,-378.511,-376.966)');
      this.svgRoot.appendChild(newGroup);
      structurePipsGroup = newGroup;
    }

    await this.loadAllStructurePips(structurePipsGroup, structure.locations, tonnage);
    } else {
      // Non-biped (quad, tripod, etc.): Generate pips dynamically using template rects
      this.generateDynamicStructurePips(structure, mechType || 'quad');
    }
  }

  /**
   * Load all structure pips into a parent group
   */
  private async loadAllStructurePips(
    parentGroup: Element,
    locations: readonly ILocationStructure[],
    tonnage: number
  ): Promise<void> {
    const pipPromises = locations.map(async (loc) => {
      await this.loadAndInsertStructurePips(parentGroup, loc.abbreviation, tonnage);
    });

    await Promise.all(pipPromises);
  }

  /**
   * Load a structure pip SVG file and insert its paths into the template
   * Structure pip files are named: BipedIS{tonnage}_{location}.svg
   */
  private async loadAndInsertStructurePips(
    parentGroup: Element,
    locationAbbr: string,
    tonnage: number
  ): Promise<void> {
    // Build the pip file path: BipedIS50_CT.svg, BipedIS50_HD.svg, etc.
    const pipFileName = `BipedIS${tonnage}_${locationAbbr}.svg`;
    const pipPath = `${PIPS_BASE_PATH}/${pipFileName}`;

    try {
      const response = await fetch(pipPath);
      if (!response.ok) {
        console.warn(`Structure pip file not found: ${pipPath}`);
        return;
      }

      const pipSvgText = await response.text();
      const parser = new DOMParser();
      const pipDoc = parser.parseFromString(pipSvgText, 'image/svg+xml');

      // Extract the path elements from the pip SVG
      const paths = pipDoc.querySelectorAll('path');
      
      if (!this.svgDoc || paths.length === 0) return;

      // Create a group for this location's structure pips
      const locationGroup = this.svgDoc.createElementNS(SVG_NS, 'g');
      locationGroup.setAttribute('id', `is_pips_${locationAbbr}`);
      locationGroup.setAttribute('class', 'structure-pips');

      // Clone each path into our template
      paths.forEach(path => {
        const clonedPath = this.svgDoc!.importNode(path, true) as SVGPathElement;
        // Ensure proper styling for structure pips (white fill with black stroke)
        if (!clonedPath.getAttribute('fill') || clonedPath.getAttribute('fill') === 'none') {
          clonedPath.setAttribute('fill', '#FFFFFF');
        }
        if (!clonedPath.getAttribute('stroke')) {
          clonedPath.setAttribute('stroke', '#000000');
        }
        locationGroup.appendChild(clonedPath);
      });

      parentGroup.appendChild(locationGroup);
    } catch (error) {
      console.warn(`Failed to load structure pip SVG: ${pipPath}`, error);
    }
  }

  /**
   * DEPRECATED: Generate structure pip circles for a location
   * Kept as fallback if external pip files are not available
   */
  private generateStructurePipsForLocationFallback(
    parentGroup: Element,
    location: ILocationStructure
  ): void {
    if (!this.svgDoc) return;

    const pipGroupId = STRUCTURE_PIP_GROUP_IDS[location.abbreviation];
    if (!pipGroupId) return;

    // Find the existing pip group to get positioning reference
    const existingPipGroup = this.svgDoc.getElementById(pipGroupId);
    if (!existingPipGroup) {
      console.warn(`Structure pip group not found: ${pipGroupId}`);
      return;
    }

    // Get all existing pip paths in this group to determine positions
    const existingPips = existingPipGroup.querySelectorAll('path.pip.structure, circle.pip.structure');
    
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
        this.generateAdditionalStructurePips(
          existingPipGroup,
          location.points - existingPips.length,
          existingPips[existingPips.length - 1] as SVGElement
        );
      }
    } else {
      // No existing pips - generate from scratch
      // Get the group's transform to determine position
      this.generateStructurePipGrid(existingPipGroup, location.points, location.abbreviation);
    }
  }

  /**
   * Generate additional structure pips beyond what the template provides
   */
  private generateAdditionalStructurePips(
    parentGroup: Element,
    count: number,
    referencePip: SVGElement
  ): void {
    if (!this.svgDoc || count <= 0) return;

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
      const pipGroup = this.svgDoc.createElementNS(SVG_NS, 'g');
      pipGroup.setAttribute('transform', `translate(${baseX + (i + 1) * spacing},${baseY})`);

      const pip = this.svgDoc.createElementNS(SVG_NS, 'circle');
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
  private generateStructurePipGrid(
    parentGroup: Element,
    count: number,
    locationAbbr: string
  ): void {
    if (!this.svgDoc || count <= 0) return;

    // Pip layout configuration based on location
    const layouts: Record<string, { cols: number; startX: number; startY: number }> = {
      'HD': { cols: 3, startX: 0, startY: 0 },
      'CT': { cols: 5, startX: 0, startY: 0 },
      'LT': { cols: 4, startX: 0, startY: 0 },
      'RT': { cols: 4, startX: 0, startY: 0 },
      'LA': { cols: 3, startX: 0, startY: 0 },
      'RA': { cols: 3, startX: 0, startY: 0 },
      'LL': { cols: 3, startX: 0, startY: 0 },
      'RL': { cols: 3, startX: 0, startY: 0 },
    };

    const layout = layouts[locationAbbr] || { cols: 4, startX: 0, startY: 0 };
    const radius = 1.75;
    const spacing = 4.5;

    const group = this.svgDoc.createElementNS(SVG_NS, 'g');
    group.setAttribute('id', `gen_is_pips_${locationAbbr}`);
    group.setAttribute('class', 'structure-pips-generated');

    for (let i = 0; i < count; i++) {
      const col = i % layout.cols;
      const row = Math.floor(i / layout.cols);

      const pip = this.svgDoc.createElementNS(SVG_NS, 'circle');
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
   * Load all armor pips into a parent group (for biped - pre-made SVG files)
   */
  private async loadAllArmorPips(parentGroup: Element, armor: IRecordSheetData['armor']): Promise<void> {
    // Load pips for each armor location
    const pipPromises = armor.locations.map(async (loc) => {
      const pipName = LOCATION_TO_PIP_NAME[loc.abbreviation];
      if (!pipName) {
        console.warn(`Unknown location abbreviation: ${loc.abbreviation}`);
        return;
      }

      // Load front armor pips
      if (loc.current > 0) {
        await this.loadAndInsertPips(
          parentGroup,
          pipName,
          loc.current,
          false
        );
      }

      // Load rear armor pips if applicable
      if (loc.rear !== undefined && loc.rear > 0 && REAR_LOCATIONS.includes(loc.abbreviation)) {
        await this.loadAndInsertPips(
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
   * Generate dynamic armor pips for non-biped mechs (quad, tripod, LAM, quadvee)
   * Uses MegaMekLab's ArmorPipLayout algorithm for proper pip positioning
   */
  private async generateDynamicArmorPips(
    armor: IRecordSheetData['armor'],
    mechType: string
  ): Promise<void> {
    if (!this.svgDoc || !this.svgRoot) return;

    // Get the pip group IDs based on mech type
    const pipGroupIds = this.getPipGroupIdsForMechType(mechType);

    armor.locations.forEach((loc) => {
      // Find the group ID for this location
      const groupId = pipGroupIds[loc.abbreviation];
      if (!groupId) {
        console.warn(`No pip group ID for location: ${loc.abbreviation}`);
        return;
      }

      // Find the pip area element in the template
      const pipArea = this.svgDoc!.getElementById(groupId);
      if (!pipArea) {
        console.warn(`Pip area not found: ${groupId}`);
        return;
      }

      // Use ArmorPipLayout to generate pips within the bounding rects
      if (loc.current > 0) {
        ArmorPipLayout.addPips(this.svgDoc!, pipArea, loc.current, {
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
          const pipArea = this.svgDoc!.getElementById(rearGroupId);
          if (pipArea && loc.rear > 0) {
            ArmorPipLayout.addPips(this.svgDoc!, pipArea, loc.rear, {
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
  private getPipGroupIdsForMechType(mechType: string): Record<string, string> {
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


  /**
   * Generate structure pips for non-biped mechs (quad, tripod, LAM, quadvee)
   * Uses MegaMekLab's ArmorPipLayout algorithm for proper pip positioning
   */
  private generateDynamicStructurePips(
    structure: IRecordSheetData['structure'],
    mechType: string
  ): void {
    if (!this.svgDoc || !this.svgRoot) return;

    // Get the structure pip group IDs based on mech type
    const pipGroupIds = this.getStructurePipGroupIdsForMechType(mechType);

    structure.locations.forEach((loc) => {
      // Find the group ID for this location
      const groupId = pipGroupIds[loc.abbreviation];
      if (!groupId) {
        console.warn(`No structure pip group ID for location: ${loc.abbreviation}`);
        return;
      }

      // Find the pip area element in the template
      const pipArea = this.svgDoc!.getElementById(groupId);
      if (!pipArea) {
        console.warn(`Structure pip area not found: ${groupId}`);
        return;
      }

      // Use ArmorPipLayout to generate pips within the bounding rects
      if (loc.points > 0) {
        ArmorPipLayout.addPips(this.svgDoc!, pipArea, loc.points, {
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
  private getStructurePipGroupIdsForMechType(mechType: string): Record<string, string> {
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


  /**
   * Load a pip SVG file and insert its paths into the template
   */
  private async loadAndInsertPips(
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
      
      if (!this.svgDoc || paths.length === 0) return;

      // Create a group for this location's pips
      // MegaMekLab imports pip paths directly - the parent's transform handles positioning
      // NO additional transform needed on location groups
      const locationGroup = this.svgDoc.createElementNS(SVG_NS, 'g');
      locationGroup.setAttribute('id', `pips_${locationName}${rearSuffix}`);
      locationGroup.setAttribute('class', 'armor-pips');

      // Clone each path into our template
      paths.forEach(path => {
        const clonedPath = this.svgDoc!.importNode(path, true) as SVGPathElement;
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
   * Get the SVG as a string
   */
  getSVGString(): string {
    if (!this.svgDoc) {
      throw new Error('Template not loaded');
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(this.svgDoc);
  }

  /**
   * Render to canvas with high-DPI support for sharp text (preview use)
   * Uses PREVIEW_DPI_MULTIPLIER (4x) to ensure crisp rendering at all zoom levels.
   */
  async renderToCanvas(canvas: HTMLCanvasElement): Promise<void> {
    // Use high DPI multiplier for crisp preview at any zoom level
    // PREVIEW_DPI_MULTIPLIER (4x) ensures sharpness up to 200% zoom
    await this.renderToCanvasHighDPI(canvas, PREVIEW_DPI_MULTIPLIER);
  }

  /**
   * Render to canvas with specified DPI multiplier (for PDF export)
   * @param canvas Target canvas element
   * @param dpiMultiplier Resolution multiplier (e.g., 3 for 216 DPI PDF)
   */
  async renderToCanvasHighDPI(canvas: HTMLCanvasElement, dpiMultiplier: number): Promise<void> {
    const svgString = this.getSVGString();
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        const baseWidth = 612;
        const baseHeight = 792;
        
        // Set canvas internal resolution based on DPI multiplier
        canvas.width = baseWidth * dpiMultiplier;
        canvas.height = baseHeight * dpiMultiplier;
        
        // Scale context to match DPI multiplier
        ctx.scale(dpiMultiplier, dpiMultiplier);
        
        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, baseWidth, baseHeight);
        
        // Calculate scale to fit SVG (576x756) into canvas (612x792)
        const scale = Math.min(baseWidth / 576, baseHeight / 756);
        const offsetX = (baseWidth - 576 * scale) / 2;
        const offsetY = (baseHeight - 756 * scale) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, 576 * scale, 756 * scale);
        
        resolve();
      };
      
      img.onerror = () => reject(new Error('Failed to load SVG image'));
      
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      img.src = URL.createObjectURL(svgBlob);
    });
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  private setTextContent(id: string, text: string): void {
    const element = this.svgDoc?.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  private renderEquipmentTable(equipment: readonly IRecordSheetEquipment[]): void {
    const inventoryArea = this.svgDoc?.getElementById(ELEMENT_IDS.INVENTORY);
    if (!inventoryArea || !this.svgDoc) return;

    const x = parseFloat(inventoryArea.getAttribute('x') || '3');
    const y = parseFloat(inventoryArea.getAttribute('y') || '87.5');
    // width available: parseFloat(inventoryArea.getAttribute('width') || '216')
    const height = parseFloat(inventoryArea.getAttribute('height') || '185');

    const group = this.svgDoc.createElementNS(SVG_NS, 'g');
    group.setAttribute('id', 'equipment-rows');
    group.setAttribute('style', 'font-family: Eurostile, Arial, sans-serif; font-size: 7px;');

    const rowHeight = 9;
    const headerY = y + 10;
    const startY = y + 22;
    const maxRows = Math.floor((height - 30) / rowHeight);

    // Column positions - adjusted for damage codes like "1/Msl [M,C,S]"
    const cols = {
      qty: x + 2,
      name: x + 12,
      loc: x + 80,      // Shortened name column
      heat: x + 95,
      dmg: x + 108,     // More space for damage + code
      min: x + 158,     // Pushed range columns right
      sht: x + 172,
      med: x + 186,
      lng: x + 200,
    };

    const headers = [
      { text: 'Qty', x: cols.qty },
      { text: 'Type', x: cols.name },
      { text: 'Loc', x: cols.loc },
      { text: 'Ht', x: cols.heat },
      { text: 'Dmg', x: cols.dmg },
      { text: 'Min', x: cols.min },
      { text: 'Sht', x: cols.sht },
      { text: 'Med', x: cols.med },
      { text: 'Lng', x: cols.lng },
    ];

    headers.forEach(h => {
      const text = this.createEquipmentText(h.x, headerY, h.text, true);
      group.appendChild(text);
    });

    const displayEquipment = equipment.slice(0, maxRows);
    displayEquipment.forEach((eq, index) => {
      const rowY = startY + index * rowHeight;

      const qty = this.createEquipmentText(cols.qty, rowY, String(eq.quantity || 1), false);
      group.appendChild(qty);

      // Truncate long names to fit in narrower column
      const name = eq.name.length > 16 ? eq.name.substring(0, 14) + '..' : eq.name;
      const nameEl = this.createEquipmentText(cols.name, rowY, name, false);
      group.appendChild(nameEl);

      const loc = this.createEquipmentText(cols.loc, rowY, eq.locationAbbr, false);
      group.appendChild(loc);

      if (eq.isWeapon || eq.isEquipment) {
        // Heat column
        const heatStr = eq.heat === 0 || eq.heat === '-' ? '-' : String(eq.heat);
        const heat = this.createEquipmentText(cols.heat, rowY, heatStr, false);
        group.appendChild(heat);
        
        // Damage column with type code: "5 [DE]" format
        const damageStr = eq.damageCode 
          ? `${eq.damage} ${eq.damageCode}` 
          : String(eq.damage || '-');
        const dmg = this.createEquipmentText(cols.dmg, rowY, damageStr, false);
        group.appendChild(dmg);
        
        // Range columns - show '-' for 0 minimum
        const minStr = eq.minimum === 0 || eq.minimum === '-' ? '-' : String(eq.minimum);
        const min = this.createEquipmentText(cols.min, rowY, minStr, false);
        group.appendChild(min);
        
        const sht = this.createEquipmentText(cols.sht, rowY, String(eq.short || '-'), false);
        const med = this.createEquipmentText(cols.med, rowY, String(eq.medium || '-'), false);
        const lng = this.createEquipmentText(cols.lng, rowY, String(eq.long || '-'), false);
        group.appendChild(sht);
        group.appendChild(med);
        group.appendChild(lng);
      } else if (eq.isAmmo) {
        const ammoInfo = this.createEquipmentText(cols.dmg, rowY, eq.ammoCount ? `(${eq.ammoCount})` : '-', false);
        group.appendChild(ammoInfo);
      }
    });

    const parent = inventoryArea.parentNode;
    if (parent) {
      parent.insertBefore(group, inventoryArea.nextSibling);
    }
  }

  private createEquipmentText(x: number, y: number, content: string, isHeader: boolean): SVGTextElement {
    const text = this.svgDoc!.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.setAttribute('fill', '#000000');
    text.setAttribute('font-size', '6px');
    if (isHeader) {
      text.setAttribute('font-weight', 'bold');
    }
    text.textContent = content;
    return text;
  }

  private renderCriticalSlots(criticals: readonly ILocationCriticals[]): void {
    criticals.forEach(loc => {
      this.renderLocationCriticals(loc);
    });
  }

  /**
   * Render critical slots for a single location
   * Uses the crits_XX rect elements from the template as positioning guides
   */
  private renderLocationCriticals(location: ILocationCriticals): void {
    const abbr = location.abbreviation;
    
    // Template uses crits_XX format (e.g., crits_HD, crits_LA)
    const critAreaId = `crits_${abbr}`;
    const critArea = this.svgDoc?.getElementById(critAreaId);

    if (!critArea || !this.svgDoc) {
      console.warn(`Critical area not found: ${critAreaId}`);
      return;
    }

    // Get the bounding rect dimensions
    const x = parseFloat(critArea.getAttribute('x') || '0');
    const y = parseFloat(critArea.getAttribute('y') || '0');
    const width = parseFloat(critArea.getAttribute('width') || '94');
    const height = parseFloat(critArea.getAttribute('height') || '103');
    
    const group = this.svgDoc.createElementNS(SVG_NS, 'g');
    group.setAttribute('id', `critSlots_${abbr}`);
    group.setAttribute('class', 'crit-slots');

    // Calculate slot dimensions based on number of slots
    const slotCount = location.slots.length;
    const gapHeight = slotCount > 6 ? 4 : 0; // Gap between slots 6 and 7 for 12-slot locations
    const slotHeight = (height - gapHeight) / slotCount;
    // MegaMekLab uses constant 7px font for ALL critical slot entries (DEFAULT_CRITICAL_SLOT_ENTRY_FONT_SIZE = 7f)
    const fontSize = 7;
    const titleFontSize = fontSize * 1.25; // 25% larger for title (MegaMekLab style)
    const numberWidth = 12; // Width for slot number column
    const barWidth = 2; // Width of multi-slot indicator bar
    const barMargin = 1; // Margin between bar and slot number
    
    // Draw location label ABOVE the crit rect (MegaMekLab style)
    // Position: 7.5% indent from left edge, above the rect with clearance
    const labelX = x + width * 0.075;
    const labelEl = this.svgDoc.createElementNS(SVG_NS, 'text');
    labelEl.setAttribute('x', String(labelX));
    labelEl.setAttribute('y', String(y - 4)); // Above the crit rect with more clearance
    labelEl.setAttribute('font-size', `${titleFontSize}px`);
    labelEl.setAttribute('font-family', 'Times New Roman, Times, serif');
    labelEl.setAttribute('font-weight', 'bold');
    labelEl.setAttribute('fill', '#000000');
    labelEl.setAttribute('text-anchor', 'start'); // Left-aligned
    labelEl.textContent = location.location;
    group.appendChild(labelEl);
    
    // Slots start at the top of the rect
    const slotsStartY = y;
    
    // First pass: identify multi-slot equipment groups
    const multiSlotGroups = this.identifyMultiSlotGroups(location.slots);
    
    location.slots.forEach((slot, index) => {
      // Calculate Y position with gap after slot 6
      let slotY: number;
      if (slotCount > 6 && index >= 6) {
        slotY = slotsStartY + (index + 0.7) * slotHeight + gapHeight;
      } else {
        slotY = slotsStartY + (index + 0.7) * slotHeight;
      }
      
      // Slot number (1-6 for each column)
      const displayNum = (index % 6) + 1;
      const numEl = this.svgDoc!.createElementNS(SVG_NS, 'text');
      numEl.setAttribute('x', String(x + barWidth + barMargin + 2));
      numEl.setAttribute('y', String(slotY));
      numEl.setAttribute('font-size', `${fontSize}px`);
      numEl.setAttribute('font-family', 'Times New Roman, Times, serif');
      numEl.setAttribute('fill', '#000000');
      numEl.textContent = `${displayNum}.`;
      group.appendChild(numEl);

      // Slot content
      const contentEl = this.svgDoc!.createElementNS(SVG_NS, 'text');
      contentEl.setAttribute('x', String(x + barWidth + barMargin + numberWidth));
      contentEl.setAttribute('y', String(slotY));
      contentEl.setAttribute('font-size', `${fontSize}px`);
      contentEl.setAttribute('font-family', 'Times New Roman, Times, serif');
      
      // Determine content and styling (MegaMekLab style)
      let content: string;
      let fillColor = '#000000';
      let fontWeight = 'normal';
      
      if (slot.content && slot.content.trim() !== '') {
        content = slot.content;
        // Bold all hittable equipment (weapons, system components, etc.)
        // Unhittables (Endo Steel, Ferro-Fibrous, TSM) are NOT bolded
        if (slot.isHittable) {
          fontWeight = 'bold';
        }
      } else if (slot.isRollAgain) {
        content = 'Roll Again';
        // Roll Again uses black text, not bold
        fontWeight = 'normal';
      } else {
        content = '-Empty-';
        fillColor = '#999999';
      }
      
      // Truncate long names to fit
      const maxChars = Math.floor((width - numberWidth - barWidth - barMargin - 6) / (fontSize * 0.5));
      if (content.length > maxChars) {
        content = content.substring(0, maxChars - 2) + '..';
      }
      
      contentEl.setAttribute('fill', fillColor);
      contentEl.setAttribute('font-weight', fontWeight);
      contentEl.textContent = content;
      
      group.appendChild(contentEl);
    });
    
    // Draw multi-slot indicator bars
    multiSlotGroups.forEach(groupInfo => {
      this.drawMultiSlotBar(group, x, slotsStartY, slotHeight, gapHeight, slotCount, groupInfo, barWidth);
    });

    // Insert after the rect element
    const parent = critArea.parentNode;
    if (parent) {
      parent.insertBefore(group, critArea.nextSibling);
    }
  }
  
  /**
   * Identify groups of consecutive slots that belong to the same multi-slot equipment
   * Only brackets USER equipment (weapons, ammo) - NOT system components (engine, gyro, actuators)
   */
  private identifyMultiSlotGroups(
    slots: readonly IRecordSheetCriticalSlot[]
  ): Array<{ startIndex: number; endIndex: number; content: string }> {
    interface SlotGroup {
      startIndex: number;
      content: string;
      equipmentId?: string;
    }
    
    const groups: Array<{ startIndex: number; endIndex: number; content: string }> = [];
    let currentGroup: SlotGroup | null = null;
    
    for (let index = 0; index < slots.length; index++) {
      const slot = slots[index];
      // Only consider user equipment (not system components) for bracketing
      const isUserEquipment = slot.content && slot.content.trim() !== '' && 
                              !slot.isRollAgain && !slot.isSystem;
      const contentKey = isUserEquipment ? (slot.equipmentId || slot.content) : null;
      
      if (isUserEquipment && currentGroup !== null && contentKey === (currentGroup.equipmentId || currentGroup.content)) {
        // Continue current group - same equipment
        continue;
      }
      
      // End current group if it spans multiple slots
      if (currentGroup !== null && index - currentGroup.startIndex > 1) {
        groups.push({
          startIndex: currentGroup.startIndex,
          endIndex: index - 1,
          content: currentGroup.content,
        });
      }
      
      // Start new group if slot has user equipment
      if (isUserEquipment) {
        currentGroup = {
          startIndex: index,
          content: slot.content,
          equipmentId: slot.equipmentId,
        };
      } else {
        currentGroup = null;
      }
    }
    
    // Handle final group
    if (currentGroup !== null && slots.length - currentGroup.startIndex > 1) {
      groups.push({
        startIndex: currentGroup.startIndex,
        endIndex: slots.length - 1,
        content: currentGroup.content,
      });
    }
    
    return groups;
  }
  
  /**
   * Draw a bracket indicating multi-slot equipment (MegaMekLab style)
   * Draws an "L" shaped bracket: horizontal top, vertical bar, horizontal bottom
   * When equipment spans across the gap between slots 6 and 7, draws a single
   * continuous bracket that bridges across the gap.
   */
  private drawMultiSlotBar(
    group: Element,
    x: number,
    y: number,
    slotHeight: number,
    gapHeight: number,
    slotCount: number,
    groupInfo: { startIndex: number; endIndex: number },
    barWidth: number
  ): void {
    if (!this.svgDoc) return;
    
    const startSlot = groupInfo.startIndex;
    const endSlot = groupInfo.endIndex;
    const bracketWidth = 3; // Width of horizontal bracket parts
    const strokeWidth = 0.72;
    
    // Calculate symmetrical padding from slot edges (15% of slot height on each end)
    const verticalPadding = slotHeight * 0.15;
    
    // Calculate Y positions accounting for the gap
    let barStartY: number;
    let barEndY: number;
    
    if (slotCount > 6 && startSlot >= 6) {
      barStartY = y + startSlot * slotHeight + gapHeight + verticalPadding;
    } else {
      barStartY = y + startSlot * slotHeight + verticalPadding;
    }
    
    if (slotCount > 6 && endSlot >= 6) {
      barEndY = y + (endSlot + 1) * slotHeight + gapHeight - verticalPadding;
    } else {
      barEndY = y + (endSlot + 1) * slotHeight - verticalPadding;
    }
    
    const bracketX = x + barWidth;
    
    // Single continuous bracket - even when spanning the gap
    // The bracket height already accounts for the gap via barEndY calculation
    this.drawBracketPath(group, bracketX, barStartY, bracketWidth, barEndY - barStartY, strokeWidth);
  }
  
  /**
   * Draw an L-shaped bracket path (MegaMekLab style)
   * Path: Move to top, horizontal left, vertical down, horizontal right
   */
  private drawBracketPath(
    group: Element,
    x: number,
    y: number,
    width: number,
    height: number,
    strokeWidth: number
  ): void {
    if (!this.svgDoc) return;
    
    const path = this.svgDoc.createElementNS(SVG_NS, 'path');
    // Draw bracket: top horizontal, vertical bar, bottom horizontal
    path.setAttribute('d', 
      `M ${x} ${y} ` +
      `h ${-width} ` +
      `v ${height} ` +
      `h ${width}`
    );
    path.setAttribute('stroke', '#000000');
    path.setAttribute('stroke-width', String(strokeWidth));
    path.setAttribute('fill', 'none');
    group.appendChild(path);
  }
}

/**
 * Create and configure an SVG renderer instance
 */
export async function createSVGRenderer(templatePath: string): Promise<SVGRecordSheetRenderer> {
  const renderer = new SVGRecordSheetRenderer();
  await renderer.loadTemplate(templatePath);
  return renderer;
}
