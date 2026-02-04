/**
 * Parity Validation Service
 *
 * Orchestrates round-trip validation: MTF → JSON → MTF → diff
 * Identifies discrepancies between original MTF files and regenerated output.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { getMTFParserService, MTFParserService } from './MTFParserService';
import { getMTFExportService, MTFExportService } from './MTFExportService';
import {
  DiscrepancyCategory,
  IDiscrepancy,
  IUnitValidationResult,
  IParityValidationOptions,
  IValidationSummary,
} from './types/ParityValidation';

/**
 * Parity Validation Service
 */
export class ParityValidationService {
  private static instance: ParityValidationService | null = null;
  private parser: MTFParserService;
  private exporter: MTFExportService;

  private constructor() {
    this.parser = getMTFParserService();
    this.exporter = getMTFExportService();
  }

  static getInstance(): ParityValidationService {
    if (!ParityValidationService.instance) {
      ParityValidationService.instance = new ParityValidationService();
    }
    return ParityValidationService.instance;
  }

  /**
   * Validate a single unit by round-trip comparison
   */
  validateUnit(mtfPath: string, outputDir: string): IUnitValidationResult {
    const issues: IDiscrepancy[] = [];
    const _parseErrors: string[] = []; // Reserved for aggregated error tracking

    try {
      // Read original MTF
      const originalContent = fs.readFileSync(mtfPath, 'utf-8');

      // Parse to ISerializedUnit
      const parseResult = this.parser.parse(originalContent);

      if (!parseResult.success || !parseResult.unit) {
        return {
          id: 'unknown',
          chassis: 'Unknown',
          model: 'Unknown',
          mtfPath,
          generatedPath: '',
          status: 'PARSE_ERROR',
          issues: [],
          parseErrors: parseResult.errors,
        };
      }

      const unit = parseResult.unit;

      // Export back to MTF
      const exportResult = this.exporter.export(unit);

      if (!exportResult.success || !exportResult.content) {
        return {
          id: unit.id,
          chassis: unit.chassis,
          model: unit.model,
          mtfPath,
          generatedPath: '',
          status: 'PARSE_ERROR',
          issues: [],
          parseErrors: exportResult.errors,
        };
      }

      // Write generated MTF
      const relativePath = this.getRelativePath(mtfPath);
      const generatedPath = path.join(outputDir, 'generated', relativePath);
      fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
      fs.writeFileSync(generatedPath, exportResult.content);

      // Compare and categorize differences
      const originalLines = this.normalizeContent(originalContent);
      const generatedLines = this.normalizeContent(exportResult.content);

      this.compareAndCategorize(originalLines, generatedLines, issues);

      return {
        id: unit.id,
        chassis: unit.chassis,
        model: unit.model,
        mtfPath,
        generatedPath,
        status: issues.length > 0 ? 'ISSUES_FOUND' : 'PASSED',
        issues,
      };
    } catch (e) {
      return {
        id: 'unknown',
        chassis: 'Unknown',
        model: 'Unknown',
        mtfPath,
        generatedPath: '',
        status: 'PARSE_ERROR',
        issues: [],
        parseErrors: [`${e}`],
      };
    }
  }

  /**
   * Validate all units in mm-data
   */
  async validateAll(
    options: IParityValidationOptions,
    progressCallback?: (current: number, total: number, unit: string) => void
  ): Promise<{
    results: IUnitValidationResult[];
    summary: IValidationSummary;
  }> {
    const meksDir = path.join(options.mmDataPath, 'data', 'mekfiles', 'meks');
    const mtfFiles = this.findMTFFiles(meksDir);

    // Apply filter if provided
    const filteredFiles = options.unitFilter ? mtfFiles.filter(options.unitFilter) : mtfFiles;

    const results: IUnitValidationResult[] = [];
    const issuesByCategory: Record<DiscrepancyCategory, number> = {} as Record<DiscrepancyCategory, number>;

    // Initialize category counts
    for (const category of Object.values(DiscrepancyCategory)) {
      issuesByCategory[category] = 0;
    }

    let processed = 0;
    for (const mtfPath of filteredFiles) {
      if (progressCallback) {
        progressCallback(processed, filteredFiles.length, mtfPath);
      }

      const result = this.validateUnit(mtfPath, options.outputPath);
      results.push(result);

      // Count issues by category
      for (const issue of result.issues) {
        issuesByCategory[issue.category]++;
      }

      processed++;
    }

    // Get mm-data commit hash
    const mmDataCommit = this.getGitCommit(options.mmDataPath);

    const summary: IValidationSummary = {
      generatedAt: new Date().toISOString(),
      mmDataCommit,
      unitsValidated: results.length,
      unitsPassed: results.filter((r) => r.status === 'PASSED').length,
      unitsWithIssues: results.filter((r) => r.status === 'ISSUES_FOUND').length,
      unitsWithParseErrors: results.filter((r) => r.status === 'PARSE_ERROR').length,
      issuesByCategory,
    };

    return { results, summary };
  }

  /**
   * Find all MTF files recursively
   */
  private findMTFFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.findMTFFiles(fullPath));
      } else if (entry.name.endsWith('.mtf')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get relative path from mm-data meks directory
   */
  private getRelativePath(mtfPath: string): string {
    const meksIndex = mtfPath.indexOf('meks');
    if (meksIndex !== -1) {
      return mtfPath.substring(meksIndex + 5); // Skip 'meks/'
    }
    return path.basename(mtfPath);
  }

  /**
   * Normalize content for comparison (remove comments, normalize whitespace)
   */
  private normalizeContent(content: string): string[] {
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'));
  }

  /**
   * Compare original and generated content, categorize differences
   */
  private compareAndCategorize(original: string[], generated: string[], issues: IDiscrepancy[]): void {
    const originalMap = this.parseToMap(original);
    const generatedMap = this.parseToMap(generated);

    // Compare header fields
    this.compareField('chassis', originalMap, generatedMap, issues, DiscrepancyCategory.HeaderMismatch);
    this.compareField('model', originalMap, generatedMap, issues, DiscrepancyCategory.HeaderMismatch);
    this.compareField('Config', originalMap, generatedMap, issues, DiscrepancyCategory.HeaderMismatch);
    this.compareField('techbase', originalMap, generatedMap, issues, DiscrepancyCategory.HeaderMismatch);

    // Compare structural fields
    this.compareField('mass', originalMap, generatedMap, issues, DiscrepancyCategory.HeaderMismatch);
    this.compareField('engine', originalMap, generatedMap, issues, DiscrepancyCategory.EngineMismatch);

    // Compare movement
    this.compareField('walk mp', originalMap, generatedMap, issues, DiscrepancyCategory.MovementMismatch);
    this.compareField('jump mp', originalMap, generatedMap, issues, DiscrepancyCategory.MovementMismatch);

    // Compare armor values (biped, quad, and tripod configurations)
    const armorFields = [
      // Biped locations
      'LA armor', 'RA armor', 'LT armor', 'RT armor', 'CT armor', 'HD armor', 'LL armor', 'RL armor',
      // Quad locations
      'FLL armor', 'FRL armor', 'RLL armor', 'RRL armor',
      // Tripod locations
      'CL armor',
      // Rear torso armor (all configurations)
      'RTL armor', 'RTR armor', 'RTC armor',
    ];
    for (const field of armorFields) {
      this.compareField(field, originalMap, generatedMap, issues, DiscrepancyCategory.ArmorMismatch);
    }

    // Compare critical slots by location
    this.compareCriticalSlots(original, generated, issues);

    // Compare quirks
    this.compareQuirks(original, generated, issues);
  }

  /**
   * Parse content lines to key-value map
   */
  private parseToMap(lines: string[]): Map<string, string> {
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

  /**
   * Compare a single field between original and generated
   */
  private compareField(
    field: string,
    original: Map<string, string>,
    generated: Map<string, string>,
    issues: IDiscrepancy[],
    category: DiscrepancyCategory
  ): void {
    let originalValue = original.get(field.toLowerCase());
    let generatedValue = generated.get(field.toLowerCase());

    // Normalize engine strings for comparison (mm-data has inconsistent formats)
    if (category === DiscrepancyCategory.EngineMismatch) {
      originalValue = this.normalizeEngineString(originalValue);
      generatedValue = this.normalizeEngineString(generatedValue);
    }

    // Normalize techbase strings for comparison (handles "Mixed (IS Chassis)" vs "Mixed")
    if (field.toLowerCase() === 'techbase') {
      originalValue = this.normalizeTechBaseString(originalValue);
      generatedValue = this.normalizeTechBaseString(generatedValue);
    }

    // Normalize armor values for comparison (handles patchwork armor format)
    if (category === DiscrepancyCategory.ArmorMismatch) {
      originalValue = this.normalizeArmorValue(originalValue);
      generatedValue = this.normalizeArmorValue(generatedValue);
    }

    if (originalValue !== generatedValue) {
      issues.push({
        category,
        field,
        expected: originalValue || '(missing)',
        actual: generatedValue || '(missing)',
        suggestion: this.getSuggestion(category, field, originalValue, generatedValue),
      });
    }  }

  /**
   * Normalize engine string for comparison
   * Handles inconsistencies like "Fusion Engine" vs "Fusion Engine(IS)"
   */
  private normalizeEngineString(value: string | undefined): string | undefined {
    if (!value) return value;
    let normalized = value;
    // Remove tech base markers (can be anywhere in string)
    normalized = normalized.replace(/\s*\(IS\)\s*/g, ' ');
    normalized = normalized.replace(/\s*\(Clan\)\s*/g, ' ');
    normalized = normalized.replace(/\s*\(Inner Sphere\)\s*/g, ' ');
    // Remove "Fusion" and "Engine" to get core type
    normalized = normalized.replace(/\s+Fusion\s*/gi, ' ');
    normalized = normalized.replace(/\s*Engine\s*/gi, ' ');
    // Normalize ICE variants: "I.C.E." -> "ICE"
    normalized = normalized.replace(/I\.C\.E\./gi, 'ICE');
    // Normalize Fuel-Cell variants
    normalized = normalized.replace(/Fuel[- ]?Cell/gi, 'FuelCell');
    // Remove "Primitive" - it's a modifier, not engine type
    normalized = normalized.replace(/\s*Primitive\s*/gi, ' ');
    // Remove "Large" from XXL (Large XXL = XXL)
    normalized = normalized.replace(/\s*Large\s*/gi, ' ');
    // Clean up multiple spaces
    normalized = normalized.replace(/\s+/g, ' ');
    return normalized.trim();
  }

  /**
   * Normalize tech base string for comparison
   * Treats "Mixed", "Mixed (IS Chassis)", "Mixed (Clan Chassis)" as equivalent
   */
  private normalizeTechBaseString(value: string | undefined): string | undefined {
    if (!value) return value;
    const lower = value.toLowerCase();
    // Normalize all mixed variants to just "mixed"
    if (lower.includes('mixed')) return 'mixed';
    if (lower.includes('clan')) return 'clan';
    if (lower.includes('inner sphere') || lower === 'is') return 'inner sphere';
    return lower.trim();
  }

  /**
   * Normalize armor value for comparison
   * Handles patchwork armor format: "ArmorType:Value" -> "Value"
   */
  private normalizeArmorValue(value: string | undefined): string | undefined {
    if (!value) return value;
    // Patchwork armor format: "Reactive(Inner Sphere):26" -> "26"
    if (value.includes(':')) {
      const parts = value.split(':');
      return parts[parts.length - 1].trim();
    }
    return value.trim();
  }

  /**
   * Compare critical slots between original and generated
   */
  private compareCriticalSlots(original: string[], generated: string[], issues: IDiscrepancy[]): void {
    const originalSlots = this.extractCriticalSlots(original);
    const generatedSlots = this.extractCriticalSlots(generated);

    for (const location of Object.keys(originalSlots)) {
      const origSlots = this.normalizeSlots(originalSlots[location] || []);
      const genSlots = this.normalizeSlots(generatedSlots[location] || []);

      // Check slot count (after normalizing trailing empty slots)
      if (origSlots.length !== genSlots.length) {
        issues.push({
          category: DiscrepancyCategory.SlotCountMismatch,
          location,
          expected: `${origSlots.length} slots`,
          actual: `${genSlots.length} slots`,
          suggestion: `Check critical slot parsing for ${location}`,
        });
      }

      // Check individual slots
      const minLen = Math.min(origSlots.length, genSlots.length);
      for (let i = 0; i < minLen; i++) {
        const origSlot = origSlots[i];
        const genSlot = genSlots[i];

        if (origSlot !== genSlot) {
          // Detect actuator issues
          if (this.isActuator(origSlot) || this.isActuator(genSlot)) {
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

  /**
   * Extract critical slots from content lines
   */
  private extractCriticalSlots(lines: string[]): Record<string, string[]> {
    const slots: Record<string, string[]> = {};
    let currentLocation: string | null = null;

    const locationHeaders: Record<string, string> = {
      // Biped locations
      'Left Arm:': 'LEFT_ARM',
      'Right Arm:': 'RIGHT_ARM',
      'Left Torso:': 'LEFT_TORSO',
      'Right Torso:': 'RIGHT_TORSO',
      'Center Torso:': 'CENTER_TORSO',
      'Head:': 'HEAD',
      'Left Leg:': 'LEFT_LEG',
      'Right Leg:': 'RIGHT_LEG',
      // Quad locations
      'Front Left Leg:': 'FRONT_LEFT_LEG',
      'Front Right Leg:': 'FRONT_RIGHT_LEG',
      'Rear Left Leg:': 'REAR_LEFT_LEG',
      'Rear Right Leg:': 'REAR_RIGHT_LEG',
      // Tripod locations
      'Center Leg:': 'CENTER_LEG',
    };

    for (const line of lines) {
      // Check for location header
      for (const [header, location] of Object.entries(locationHeaders)) {
        if (line === header) {
          currentLocation = location;
          slots[location] = [];
          break;
        }
      }

      // If in location section, add slot
      if (currentLocation && !line.endsWith(':') && line !== '') {
        // Check for section break
        if (line.includes(':') && !line.startsWith('-')) {
          currentLocation = null;
          continue;
        }
        slots[currentLocation].push(line === '-Empty-' ? '' : line);
      }
    }

    return slots;
  }

  /**
   * Normalize slot array by stripping trailing empty slots
   * This handles MegaMek's inconsistent padding (some files pad to 12, others don't)
   */
  private normalizeSlots(slots: string[]): string[] {
    // Find the last non-empty slot
    let lastNonEmpty = slots.length - 1;
    while (lastNonEmpty >= 0 && (slots[lastNonEmpty] === '-Empty-' || slots[lastNonEmpty] === '')) {
      lastNonEmpty--;
    }
    return slots.slice(0, lastNonEmpty + 1);
  }

  /**
   * Check if a slot entry is an actuator
   */
  private isActuator(slot: string | undefined): boolean {
    if (!slot) return false;
    const actuators = [
      'Shoulder',
      'Upper Arm Actuator',
      'Lower Arm Actuator',
      'Hand Actuator',
      'Hip',
      'Upper Leg Actuator',
      'Lower Leg Actuator',
      'Foot Actuator',
    ];
    return actuators.includes(slot);
  }

  /**
   * Compare quirks between original and generated
   */
  private compareQuirks(original: string[], generated: string[], issues: IDiscrepancy[]): void {
    const origQuirks = original.filter((l) => l.startsWith('quirk:')).map((l) => l.substring(6));
    const genQuirks = generated.filter((l) => l.startsWith('quirk:')).map((l) => l.substring(6));

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

  /**
   * Generate suggestion based on discrepancy type
   */
  private getSuggestion(
    category: DiscrepancyCategory,
    field: string,
    expected: string | undefined,
    actual: string | undefined
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

  /**
   * Get git commit hash for mm-data
   */
  private getGitCommit(mmDataPath: string): string | undefined {
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
}

/**
 * Get singleton instance
 */
export function getParityValidationService(): ParityValidationService {
  return ParityValidationService.getInstance();
}
