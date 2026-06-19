import * as fs from 'fs';
import * as path from 'path';

import { compareCriticalSlots } from './ParityValidationCriticalSlots';
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
