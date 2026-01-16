/**
 * Template loading and document configuration utilities
 */

import { SVG_NS } from './constants';

/**
 * Load an SVG template from a URL
 */
export async function loadSVGTemplate(templatePath: string): Promise<{
  svgDoc: Document;
  svgRoot: SVGSVGElement;
}> {
  const response = await fetch(templatePath);
  const svgText = await response.text();

  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

  // Check for parse errors first
  const parseError = svgDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Failed to parse SVG template: ${parseError.textContent}`);
  }

  // Verify documentElement is an SVG element
  const docElement = svgDoc.documentElement;
  if (
    docElement.tagName === 'svg' &&
    docElement.namespaceURI === SVG_NS &&
    docElement instanceof SVGSVGElement
  ) {
    return { svgDoc, svgRoot: docElement };
  } else {
    throw new Error('SVG template root element is not a valid SVGSVGElement');
  }
}

/**
 * Add margins around the SVG document for proper spacing on all edges
 * The original template is 576x756, we expand to 612x792 (US Letter) with centered content
 */
export function addDocumentMargins(svgRoot: SVGSVGElement): void {
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
  svgRoot.setAttribute('viewBox', `${-marginX} ${-marginY} ${targetWidth} ${targetHeight}`);

  // Update width/height to target size
  svgRoot.setAttribute('width', String(targetWidth));
  svgRoot.setAttribute('height', String(targetHeight));
}

/**
 * Hide the second crew damage panel (crewDamage1) for single-pilot mechs
 * The template has two crew panels for dual-cockpit mechs, but most mechs only have one pilot
 */
export function hideSecondCrewPanel(svgDoc: Document): void {
  const crewDamage1 = svgDoc.getElementById('crewDamage1');
  if (crewDamage1) {
    crewDamage1.setAttribute('visibility', 'hidden');
  }
}

/**
 * Fix the copyright text: replace year placeholder, set font, and adjust spacing
 * Matches MegaMekLab's style: Eurostile bold font, centered at bottom
 */
export function fixCopyrightYear(svgDoc: Document): void {
  // Get the footer parent element to adjust font and position
  const footerElement = svgDoc.getElementById('footer');
  if (footerElement) {
    // Use Eurostile (MegaMekLab's font) with web-safe fallbacks
    footerElement.setAttribute('font-family', 'Eurostile, "Century Gothic", "Trebuchet MS", Arial, sans-serif');
    footerElement.setAttribute('font-size', '7.5px');
    footerElement.setAttribute('font-weight', 'bold');
    // Position near bottom with margin space (content area ends at 756, margin adds 18 more)
    footerElement.setAttribute('transform', 'translate(288.0 762.0)');
  }

  const copyrightElement = svgDoc.getElementById('tspanCopyright');
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
  const catalystElement = svgDoc.getElementById('tspan221');
  if (catalystElement) {
    catalystElement.removeAttribute('textLength');
    catalystElement.removeAttribute('lengthAdjust');
    // Second line at baseline
    catalystElement.setAttribute('y', '0');
  }
}

/**
 * Helper to set text content of an element by ID
 */
export function setTextContent(svgDoc: Document, id: string, text: string): void {
  const element = svgDoc.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}
