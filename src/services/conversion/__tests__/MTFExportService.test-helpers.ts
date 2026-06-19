/**
 * MTF Export Service Tests
 *
 * Tests for exporting ISerializedUnit objects to MTF (MegaMek Text Format) strings.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 * @spec openspec/specs/serialization-formats/spec.md
 */

// CRITICAL: Unmock these modules to ensure we test the real implementation
// ParityValidationService.test.ts mocks MTFExportService, so we must explicitly unmock it here
jest.unmock('@/services/conversion/MTFExportService');
jest.unmock('@/services/conversion/MTFParserService');

import {
  MTFExportService,
  getMTFExportService,
} from '@/services/conversion/MTFExportService';
import { getMTFParserService } from '@/services/conversion/MTFParserService';
import {
  ISerializedUnit,
  ISerializedFluff,
} from '@/types/unit/UnitSerialization';

// Helper: Create Minimal Valid Unit
// ============================================================================
export const createMinimalUnit = (
  overrides?: Partial<ISerializedUnit>,
): ISerializedUnit => ({
  id: 'test-mech-1',
  chassis: 'TestMech',
  model: 'TST-1',
  unitType: 'BattleMech',
  configuration: 'BIPED',
  techBase: 'INNER_SPHERE',
  rulesLevel: 'STANDARD',
  era: 'Succession Wars',
  year: 3025,
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'Standard',
  structure: { type: 'STANDARD' },
  armor: {
    type: 'STANDARD',
    allocation: {
      HEAD: 9,
      CENTER_TORSO: { front: 20, rear: 10 },
      LEFT_TORSO: { front: 16, rear: 8 },
      RIGHT_TORSO: { front: 16, rear: 8 },
      LEFT_ARM: 12,
      RIGHT_ARM: 12,
      LEFT_LEG: 16,
      RIGHT_LEG: 16,
    },
  },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
  criticalSlots: {
    HEAD: [
      'Life Support',
      'Sensors',
      'Cockpit',
      null,
      'Sensors',
      'Life Support',
    ],
    LEFT_ARM: [],
    RIGHT_ARM: [],
    LEFT_TORSO: [],
    RIGHT_TORSO: [],
    CENTER_TORSO: [],
    LEFT_LEG: [],
    RIGHT_LEG: [],
  },
  ...overrides,
});

// ============================================================================
// export() - Main Export Function
// ============================================================================
