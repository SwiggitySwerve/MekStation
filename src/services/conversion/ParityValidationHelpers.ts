import * as fs from 'fs';
import * as path from 'path';

import { DiscrepancyCategory, IDiscrepancy } from './types/ParityValidation';

const ARMOR_FIELDS = [
  'LA armor',
  'RA armor',
  'LT armor',
  'RT armor',
  'CT armor',
  'HD armor',
  'LL armor',
  'RL armor',
  'FLL armor',
  'FRL armor',
  'RLL armor',
  'RRL armor',
  'CL armor',
  'RTL armor',
  'RTR armor',
  'RTC armor',
];

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

export function findMTFFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMTFFiles(fullPath));
    } else if (entry.name.endsWith('.mtf')) {
      files.push(fullPath);
    }
  }

  return files;
}

export function getRelativePath(mtfPath: string): string {
  const meksIndex = mtfPath.indexOf('meks');
  if (meksIndex !== -1) {
    return mtfPath.substring(meksIndex + 5);
  }
  return path.basename(mtfPath);
}

export function normalizeContent(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

function parseToMap(lines: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      map.set(key, value);
    }
  }
  return map;
}

function normalizeEngineString(value: string | undefined): string | undefined {
  if (!value) return value;
  let normalized = value;
  normalized = normalized.replace(/\s*\(IS\)\s*/g, ' ');
  normalized = normalized.replace(/\s*\(Clan\)\s*/g, ' ');
  normalized = normalized.replace(/\s*\(Inner Sphere\)\s*/g, ' ');
  normalized = normalized.replace(/\s+Fusion\s*/gi, ' ');
  normalized = normalized.replace(/\s*Engine\s*/gi, ' ');
  normalized = normalized.replace(/I\.C\.E\./gi, 'ICE');
  normalized = normalized.replace(/Fuel[- ]?Cell/gi, 'FuelCell');
  normalized = normalized.replace(/\s*Primitive\s*/gi, ' ');
  normalized = normalized.replace(/\s*Large\s*/gi, ' ');
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized.trim();
}

function normalizeTechBaseString(
  value: string | undefined,
): string | undefined {
  if (!value) return value;
  const lower = value.toLowerCase();
  if (lower.includes('mixed')) return 'mixed';
  if (lower.includes('clan')) return 'clan';
  if (lower.includes('inner sphere') || lower === 'is') return 'inner sphere';
  return lower.trim();
}

function normalizeArmorValue(value: string | undefined): string | undefined {
  if (!value) return value;
  if (value.includes(':')) {
    const parts = value.split(':');
    return parts[parts.length - 1].trim();
  }
  return value.trim();
}

function getSuggestion(
  category: DiscrepancyCategory,
  field: string,
  expected: string | undefined,
  actual: string | undefined,
): string {
  switch (category) {
    case DiscrepancyCategory.EngineMismatch:
      return `Update MTFExportService.formatEngineType() to output "${expected}" instead of "${actual}"`;
    case DiscrepancyCategory.ArmorMismatch:
      return `Check armor value parsing/export for ${field}`;
    case DiscrepancyCategory.MovementMismatch:
      return `Check movement parsing for ${field}`;
    default:
      return `Update ${field} handling in parser or exporter`;
  }
}

function compareField(
  field: string,
  original: Map<string, string>,
  generated: Map<string, string>,
  issues: IDiscrepancy[],
  category: DiscrepancyCategory,
): void {
  let originalValue = original.get(field.toLowerCase());
  let generatedValue = generated.get(field.toLowerCase());

  if (category === DiscrepancyCategory.EngineMismatch) {
    originalValue = normalizeEngineString(originalValue);
    generatedValue = normalizeEngineString(generatedValue);
  }

  if (field.toLowerCase() === 'techbase') {
    originalValue = normalizeTechBaseString(originalValue);
    generatedValue = normalizeTechBaseString(generatedValue);
  }

  if (category === DiscrepancyCategory.ArmorMismatch) {
    originalValue = normalizeArmorValue(originalValue);
    generatedValue = normalizeArmorValue(generatedValue);
  }

  if (originalValue !== generatedValue) {
    issues.push({
      category,
      field,
      expected: originalValue || '(missing)',
      actual: generatedValue || '(missing)',
      suggestion: getSuggestion(category, field, originalValue, generatedValue),
    });
  }
}

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

function compareCriticalSlots(
  original: string[],
  generated: string[],
  issues: IDiscrepancy[],
): void {
  const originalSlots = extractCriticalSlots(original);
  const generatedSlots = extractCriticalSlots(generated);

  for (const location of Object.keys(originalSlots)) {
    const origSlots = normalizeSlots(originalSlots[location] || []);
    const genSlots = normalizeSlots(generatedSlots[location] || []);

    if (origSlots.length !== genSlots.length) {
      issues.push({
        category: DiscrepancyCategory.SlotCountMismatch,
        location,
        expected: `${origSlots.length} slots`,
        actual: `${genSlots.length} slots`,
        suggestion: `Check critical slot parsing for ${location}`,
      });
    }

    const minLen = Math.min(origSlots.length, genSlots.length);
    for (let i = 0; i < minLen; i++) {
      const origSlot = origSlots[i];
      const genSlot = genSlots[i];

      if (origSlot !== genSlot) {
        if (isActuator(origSlot) || isActuator(genSlot)) {
          if (origSlot && !genSlot) {
            issues.push({
              category: DiscrepancyCategory.MissingActuator,
              location,
              index: i,
              expected: origSlot,
              actual: genSlot || '-Empty-',
              suggestion: `Add ${origSlot} to ${location} slot ${i}`,
            });
          } else if (!origSlot && genSlot) {
            issues.push({
              category: DiscrepancyCategory.ExtraActuator,
              location,
              index: i,
              expected: origSlot || '-Empty-',
              actual: genSlot,
              suggestion: `Remove ${genSlot} from ${location} slot ${i}`,
            });
          } else {
            issues.push({
              category: DiscrepancyCategory.SlotMismatch,
              location,
              index: i,
              expected: origSlot,
              actual: genSlot,
              suggestion: `Check actuator configuration for ${location}`,
            });
          }
        } else {
          issues.push({
            category: DiscrepancyCategory.SlotMismatch,
            location,
            index: i,
            expected: origSlot || '-Empty-',
            actual: genSlot || '-Empty-',
            suggestion: `Update slot ${i} in ${location}`,
          });
        }
      }
    }
  }
}

function compareQuirks(
  original: string[],
  generated: string[],
  issues: IDiscrepancy[],
): void {
  const origQuirks = original
    .filter((l) => l.startsWith('quirk:'))
    .map((l) => l.substring(6));
  const genQuirks = generated
    .filter((l) => l.startsWith('quirk:'))
    .map((l) => l.substring(6));

  const origSet = new Set(origQuirks);
  const genSet = new Set(genQuirks);

  for (const quirk of origQuirks) {
    if (!genSet.has(quirk)) {
      issues.push({
        category: DiscrepancyCategory.QuirkMismatch,
        expected: quirk,
        actual: '(missing)',
        suggestion: `Add quirk: ${quirk}`,
      });
    }
  }

  for (const quirk of genQuirks) {
    if (!origSet.has(quirk)) {
      issues.push({
        category: DiscrepancyCategory.QuirkMismatch,
        expected: '(not present)',
        actual: quirk,
        suggestion: `Remove quirk: ${quirk}`,
      });
    }
  }
}

export function compareAndCategorize(
  original: string[],
  generated: string[],
): IDiscrepancy[] {
  const issues: IDiscrepancy[] = [];
  const originalMap = parseToMap(original);
  const generatedMap = parseToMap(generated);

  compareField(
    'chassis',
    originalMap,
    generatedMap,
    issues,
    DiscrepancyCategory.HeaderMismatch,
  );
  compareField(
    'model',
    originalMap,
    generatedMap,
    issues,
    DiscrepancyCategory.HeaderMismatch,
  );
  compareField(
    'Config',
    originalMap,
    generatedMap,
    issues,
    DiscrepancyCategory.HeaderMismatch,
  );
  compareField(
    'techbase',
    originalMap,
    generatedMap,
    issues,
    DiscrepancyCategory.HeaderMismatch,
  );

  compareField(
    'mass',
    originalMap,
    generatedMap,
    issues,
    DiscrepancyCategory.HeaderMismatch,
  );
  compareField(
    'engine',
    originalMap,
    generatedMap,
    issues,
    DiscrepancyCategory.EngineMismatch,
  );

  compareField(
    'walk mp',
    originalMap,
    generatedMap,
    issues,
    DiscrepancyCategory.MovementMismatch,
  );
  compareField(
    'jump mp',
    originalMap,
    generatedMap,
    issues,
    DiscrepancyCategory.MovementMismatch,
  );

  for (const field of ARMOR_FIELDS) {
    compareField(
      field,
      originalMap,
      generatedMap,
      issues,
      DiscrepancyCategory.ArmorMismatch,
    );
  }

  compareCriticalSlots(original, generated, issues);
  compareQuirks(original, generated, issues);

  return issues;
}

export function getGitCommit(mmDataPath: string): string | undefined {
  try {
    const headPath = path.join(mmDataPath, '.git', 'HEAD');
    const head = fs.readFileSync(headPath, 'utf-8').trim();

    if (head.startsWith('ref:')) {
      const refPath = path.join(mmDataPath, '.git', head.substring(5).trim());
      return fs.readFileSync(refPath, 'utf-8').trim().substring(0, 7);
    }

    return head.substring(0, 7);
  } catch {
    return undefined;
  }
}
