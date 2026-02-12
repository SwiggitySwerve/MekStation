/**
 * Critical slots rendering utilities
 * Renders critical hit tables for each location with multi-slot equipment brackets
 */

import { ILocationCriticals, IRecordSheetCriticalSlot } from '@/types/printing';
import { logger } from '@/utils/logger';

import { SVG_NS } from './constants';

/**
 * Render critical slots for all locations
 */
export function renderCriticalSlots(
  svgDoc: Document,
  criticals: readonly ILocationCriticals[],
): void {
  criticals.forEach((loc) => {
    renderLocationCriticals(svgDoc, loc);
  });
}

/**
 * Render critical slots for a single location
 * Uses the crits_XX rect elements from the template as positioning guides
 */
function renderLocationCriticals(
  svgDoc: Document,
  location: ILocationCriticals,
): void {
  const abbr = location.abbreviation;

  // Template uses crits_XX format (e.g., crits_HD, crits_LA)
  const critAreaId = `crits_${abbr}`;
  const critArea = svgDoc.getElementById(critAreaId);

  if (!critArea) {
    logger.warn(`Critical area not found: ${critAreaId}`);
    return;
  }

  // Get the bounding rect dimensions
  const x = parseFloat(critArea.getAttribute('x') || '0');
  const y = parseFloat(critArea.getAttribute('y') || '0');
  const width = parseFloat(critArea.getAttribute('width') || '94');
  const height = parseFloat(critArea.getAttribute('height') || '103');

  const group = svgDoc.createElementNS(SVG_NS, 'g');
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
  const labelEl = svgDoc.createElementNS(SVG_NS, 'text');
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
  const multiSlotGroups = identifyMultiSlotGroups(location.slots);

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
    const numEl = svgDoc.createElementNS(SVG_NS, 'text');
    numEl.setAttribute('x', String(x + barWidth + barMargin + 2));
    numEl.setAttribute('y', String(slotY));
    numEl.setAttribute('font-size', `${fontSize}px`);
    numEl.setAttribute('font-family', 'Times New Roman, Times, serif');
    numEl.setAttribute('fill', '#000000');
    numEl.textContent = `${displayNum}.`;
    group.appendChild(numEl);

    // Slot content
    const contentEl = svgDoc.createElementNS(SVG_NS, 'text');
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
    const maxChars = Math.floor(
      (width - numberWidth - barWidth - barMargin - 6) / (fontSize * 0.5),
    );
    if (content.length > maxChars) {
      content = content.substring(0, maxChars - 2) + '..';
    }

    contentEl.setAttribute('fill', fillColor);
    contentEl.setAttribute('font-weight', fontWeight);
    contentEl.textContent = content;

    group.appendChild(contentEl);
  });

  // Draw multi-slot indicator bars
  multiSlotGroups.forEach((groupInfo) => {
    drawMultiSlotBar(
      svgDoc,
      group,
      x,
      slotsStartY,
      slotHeight,
      gapHeight,
      slotCount,
      groupInfo,
      barWidth,
    );
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
function identifyMultiSlotGroups(
  slots: readonly IRecordSheetCriticalSlot[],
): Array<{ startIndex: number; endIndex: number; content: string }> {
  interface SlotGroup {
    startIndex: number;
    content: string;
    equipmentId?: string;
  }

  const groups: Array<{
    startIndex: number;
    endIndex: number;
    content: string;
  }> = [];
  let currentGroup: SlotGroup | null = null;

  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index];
    // Only consider user equipment (not system components) for bracketing
    const isUserEquipment =
      slot.content &&
      slot.content.trim() !== '' &&
      !slot.isRollAgain &&
      !slot.isSystem;
    const contentKey = isUserEquipment
      ? slot.equipmentId || slot.content
      : null;

    if (
      isUserEquipment &&
      currentGroup !== null &&
      contentKey === (currentGroup.equipmentId || currentGroup.content)
    ) {
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
function drawMultiSlotBar(
  svgDoc: Document,
  group: Element,
  x: number,
  y: number,
  slotHeight: number,
  gapHeight: number,
  slotCount: number,
  groupInfo: { startIndex: number; endIndex: number },
  barWidth: number,
): void {
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
  drawBracketPath(
    svgDoc,
    group,
    bracketX,
    barStartY,
    bracketWidth,
    barEndY - barStartY,
    strokeWidth,
  );
}

/**
 * Draw an L-shaped bracket path (MegaMekLab style)
 * Path: Move to top, horizontal left, vertical down, horizontal right
 */
function drawBracketPath(
  svgDoc: Document,
  group: Element,
  x: number,
  y: number,
  width: number,
  height: number,
  strokeWidth: number,
): void {
  const path = svgDoc.createElementNS(SVG_NS, 'path');
  // Draw bracket: top horizontal, vertical bar, bottom horizontal
  path.setAttribute(
    'd',
    `M ${x} ${y} ` + `h ${-width} ` + `v ${height} ` + `h ${width}`,
  );
  path.setAttribute('stroke', '#000000');
  path.setAttribute('stroke-width', String(strokeWidth));
  path.setAttribute('fill', 'none');
  group.appendChild(path);
}
