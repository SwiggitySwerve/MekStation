import { DiscrepancyCategory, IDiscrepancy } from './types/ParityValidation';

const LOCATION_HEADERS: Record<string, string> = {
  'Left Arm:': 'LEFT_ARM',
  'Right Arm:': 'RIGHT_ARM',
  'Left Torso:': 'LEFT_TORSO',
  'Right Torso:': 'RIGHT_TORSO',
  'Center Torso:': 'CENTER_TORSO',
  'Head:': 'HEAD',
  'Left Leg:': 'LEFT_LEG',
  'Right Leg:': 'RIGHT_LEG',
  'Front Left Leg:': 'FRONT_LEFT_LEG',
  'Front Right Leg:': 'FRONT_RIGHT_LEG',
  'Rear Left Leg:': 'REAR_LEFT_LEG',
  'Rear Right Leg:': 'REAR_RIGHT_LEG',
  'Center Leg:': 'CENTER_LEG',
};

const ACTUATORS = new Set([
  'Shoulder',
  'Upper Arm Actuator',
  'Lower Arm Actuator',
  'Hand Actuator',
  'Hip',
  'Upper Leg Actuator',
  'Lower Leg Actuator',
  'Foot Actuator',
]);

function extractCriticalSlots(lines: string[]): Record<string, string[]> {
  const slots: Record<string, string[]> = {};
  let currentLocation: string | null = null;

  for (const line of lines) {
    for (const [header, location] of Object.entries(LOCATION_HEADERS)) {
      if (line === header) {
        currentLocation = location;
        slots[location] = [];
        break;
      }
    }

    if (currentLocation && !line.endsWith(':') && line !== '') {
      if (line.includes(':') && !line.startsWith('-')) {
        currentLocation = null;
        continue;
      }
      slots[currentLocation].push(line === '-Empty-' ? '' : line);
    }
  }

  return slots;
}

function normalizeSlots(slots: string[]): string[] {
  let lastNonEmpty = slots.length - 1;
  while (
    lastNonEmpty >= 0 &&
    (slots[lastNonEmpty] === '-Empty-' || slots[lastNonEmpty] === '')
  ) {
    lastNonEmpty--;
  }
  return slots.slice(0, lastNonEmpty + 1);
}

function isActuator(slot: string | undefined): boolean {
  if (!slot) return false;
  return ACTUATORS.has(slot);
}

function emptySlotLabel(slot: string | undefined): string {
  return slot || '-Empty-';
}

function slotCountMismatchIssue(
  location: string,
  origSlots: readonly string[],
  genSlots: readonly string[],
): IDiscrepancy | null {
  if (origSlots.length === genSlots.length) {
    return null;
  }

  return {
    category: DiscrepancyCategory.SlotCountMismatch,
    location,
    expected: `${origSlots.length} slots`,
    actual: `${genSlots.length} slots`,
    suggestion: `Check critical slot parsing for ${location}`,
  };
}

function actuatorSlotMismatchIssue(
  location: string,
  index: number,
  origSlot: string | undefined,
  genSlot: string | undefined,
): IDiscrepancy | null {
  if (!isActuator(origSlot) && !isActuator(genSlot)) {
    return null;
  }

  if (origSlot && !genSlot) {
    return {
      category: DiscrepancyCategory.MissingActuator,
      location,
      index,
      expected: origSlot,
      actual: emptySlotLabel(genSlot),
      suggestion: `Add ${origSlot} to ${location} slot ${index}`,
    };
  }

  if (!origSlot && genSlot) {
    return {
      category: DiscrepancyCategory.ExtraActuator,
      location,
      index,
      expected: emptySlotLabel(origSlot),
      actual: genSlot,
      suggestion: `Remove ${genSlot} from ${location} slot ${index}`,
    };
  }

  return {
    category: DiscrepancyCategory.SlotMismatch,
    location,
    index,
    expected: emptySlotLabel(origSlot),
    actual: emptySlotLabel(genSlot),
    suggestion: `Check actuator configuration for ${location}`,
  };
}

function slotMismatchIssue(
  location: string,
  index: number,
  origSlot: string | undefined,
  genSlot: string | undefined,
): IDiscrepancy | null {
  if (origSlot === genSlot) {
    return null;
  }

  return (
    actuatorSlotMismatchIssue(location, index, origSlot, genSlot) ?? {
      category: DiscrepancyCategory.SlotMismatch,
      location,
      index,
      expected: emptySlotLabel(origSlot),
      actual: emptySlotLabel(genSlot),
      suggestion: `Update slot ${index} in ${location}`,
    }
  );
}

function compareLocationCriticalSlots(
  location: string,
  origSlots: readonly string[],
  genSlots: readonly string[],
  issues: IDiscrepancy[],
): void {
  const countIssue = slotCountMismatchIssue(location, origSlots, genSlots);
  if (countIssue) {
    issues.push(countIssue);
  }

  const minLen = Math.min(origSlots.length, genSlots.length);
  for (let index = 0; index < minLen; index++) {
    const issue = slotMismatchIssue(
      location,
      index,
      origSlots[index],
      genSlots[index],
    );
    if (issue) {
      issues.push(issue);
    }
  }
}

export function compareCriticalSlots(
  original: string[],
  generated: string[],
  issues: IDiscrepancy[],
): void {
  const originalSlots = extractCriticalSlots(original);
  const generatedSlots = extractCriticalSlots(generated);

  for (const location of Object.keys(originalSlots)) {
    const origSlots = normalizeSlots(originalSlots[location] || []);
    const genSlots = normalizeSlots(generatedSlots[location] || []);
    compareLocationCriticalSlots(location, origSlots, genSlots, issues);
  }
}
