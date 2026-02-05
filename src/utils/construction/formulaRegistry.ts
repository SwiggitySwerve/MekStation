/**
 * Formula Registry
 *
 * Centralized registry for all BattleTech construction formulas.
 * Each formula references its source in the TechManual.
 *
 * @spec openspec/specs/formula-registry/spec.md
 */

/**
 * Formula metadata
 */
export interface FormulaDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly formula: string;
  readonly source: string;
  readonly pageReference?: number;
}

/**
 * Weight calculation formulas
 */
export const WEIGHT_FORMULAS: readonly FormulaDefinition[] = [
  {
    id: 'engine.standard',
    name: 'Standard Fusion Engine Weight',
    description: 'Base weight for standard fusion engines',
    formula: 'Look up in Engine Weight Table (TM p.49)',
    source: 'TechManual',
    pageReference: 49,
  },
  {
    id: 'engine.xl',
    name: 'XL Engine Weight',
    description: 'Weight for XL engines (50% of standard)',
    formula: 'Standard Weight × 0.5',
    source: 'TechManual',
    pageReference: 49,
  },
  {
    id: 'engine.light',
    name: 'Light Engine Weight',
    description: 'Weight for light engines (75% of standard)',
    formula: 'Standard Weight × 0.75',
    source: 'TechManual',
    pageReference: 49,
  },
  {
    id: 'engine.compact',
    name: 'Compact Engine Weight',
    description: 'Weight for compact engines (150% of standard)',
    formula: 'Standard Weight × 1.5',
    source: 'TechManual',
    pageReference: 49,
  },
  {
    id: 'gyro.standard',
    name: 'Standard Gyro Weight',
    description: 'Weight for standard gyro',
    formula: 'ceil(Engine Rating / 100)',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'gyro.xl',
    name: 'XL Gyro Weight',
    description: 'Weight for XL gyro (50% of standard)',
    formula: 'ceil(Standard Gyro Weight × 0.5)',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'gyro.compact',
    name: 'Compact Gyro Weight',
    description: 'Weight for compact gyro (150% of standard)',
    formula: 'ceil(Standard Gyro Weight × 1.5)',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'gyro.heavy_duty',
    name: 'Heavy-Duty Gyro Weight',
    description: 'Weight for heavy-duty gyro (200% of standard)',
    formula: 'ceil(Standard Gyro Weight × 2.0)',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'structure.standard',
    name: 'Standard Internal Structure Weight',
    description: 'Weight for standard internal structure',
    formula: 'Tonnage × 0.10, rounded to 0.5t',
    source: 'TechManual',
    pageReference: 47,
  },
  {
    id: 'structure.endo_steel',
    name: 'Endo Steel Structure Weight',
    description: 'Weight for Endo Steel internal structure',
    formula: 'Tonnage × 0.05, rounded to 0.5t',
    source: 'TechManual',
    pageReference: 47,
  },
  {
    id: 'armor.standard',
    name: 'Standard Armor Weight',
    description: 'Weight for standard armor',
    formula: 'Total Points / 16, rounded up to 0.5t',
    source: 'TechManual',
    pageReference: 51,
  },
  {
    id: 'armor.ferro_fibrous',
    name: 'Ferro-Fibrous Armor Weight',
    description: 'Weight for Ferro-Fibrous armor',
    formula: 'Total Points / 17.92 (IS) or 19.2 (Clan), rounded up to 0.5t',
    source: 'TechManual',
    pageReference: 51,
  },
  {
    id: 'heat_sink.external',
    name: 'External Heat Sink Weight',
    description: 'Weight for external heat sinks',
    formula: 'Number of External × 1.0t per sink',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'jump_jet.standard',
    name: 'Standard Jump Jet Weight',
    description: 'Weight per jump jet by tonnage class',
    formula: '0.5t (≤55t), 1.0t (56-85t), 2.0t (≥86t)',
    source: 'TechManual',
    pageReference: 53,
  },
];

/**
 * Movement calculation formulas
 */
export const MOVEMENT_FORMULAS: readonly FormulaDefinition[] = [
  {
    id: 'movement.walk',
    name: 'Walk MP',
    description: 'Walking movement points',
    formula: 'floor(Engine Rating / Tonnage)',
    source: 'TechManual',
    pageReference: 27,
  },
  {
    id: 'movement.run',
    name: 'Run MP',
    description: 'Running movement points',
    formula: 'ceil(Walk MP × 1.5)',
    source: 'TechManual',
    pageReference: 27,
  },
  {
    id: 'movement.sprint_masc',
    name: 'Sprint MP (MASC)',
    description: 'Sprint with MASC active',
    formula: 'floor(Walk MP × 2)',
    source: 'TechManual',
    pageReference: 230,
  },
  {
    id: 'movement.sprint_combined',
    name: 'Sprint MP (MASC + Supercharger)',
    description: 'Sprint with both MASC and Supercharger',
    formula: 'floor(Walk MP × 2.5)',
    source: 'TechManual',
    pageReference: 230,
  },
  {
    id: 'movement.engine_rating',
    name: 'Engine Rating',
    description: 'Required engine rating for desired walk MP',
    formula: 'Tonnage × Walk MP',
    source: 'TechManual',
    pageReference: 27,
  },
];

/**
 * Slot calculation formulas
 */
export const SLOT_FORMULAS: readonly FormulaDefinition[] = [
  {
    id: 'slots.engine.ct',
    name: 'Engine CT Slots',
    description: 'Center torso slots for engine',
    formula: '6 slots (Standard), 3 slots (Compact)',
    source: 'TechManual',
    pageReference: 49,
  },
  {
    id: 'slots.engine.side',
    name: 'Engine Side Torso Slots',
    description: 'Per-side torso slots for XL/Light/XXL engines',
    formula: 'XL IS=3, XL Clan=2, Light=2, XXL=3',
    source: 'TechManual',
    pageReference: 49,
  },
  {
    id: 'slots.gyro',
    name: 'Gyro Slots',
    description: 'Center torso slots for gyro',
    formula: 'Standard=4, XL=6, Compact=2, Heavy-Duty=4',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'slots.heat_sink.double_is',
    name: 'Double Heat Sink Slots (IS)',
    description: 'Slots per IS double heat sink',
    formula: '3 slots per external sink',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'slots.heat_sink.double_clan',
    name: 'Double Heat Sink Slots (Clan)',
    description: 'Slots per Clan double heat sink',
    formula: '2 slots per external sink',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'slots.endo_steel.is',
    name: 'Endo Steel Slots (IS)',
    description: 'Distributed slots for IS Endo Steel',
    formula: '14 slots distributed',
    source: 'TechManual',
    pageReference: 47,
  },
  {
    id: 'slots.endo_steel.clan',
    name: 'Endo Steel Slots (Clan)',
    description: 'Distributed slots for Clan Endo Steel',
    formula: '7 slots distributed',
    source: 'TechManual',
    pageReference: 47,
  },
  {
    id: 'slots.ferro_fibrous.is',
    name: 'Ferro-Fibrous Slots (IS)',
    description: 'Distributed slots for IS Ferro-Fibrous',
    formula: '14 slots distributed',
    source: 'TechManual',
    pageReference: 51,
  },
  {
    id: 'slots.ferro_fibrous.clan',
    name: 'Ferro-Fibrous Slots (Clan)',
    description: 'Distributed slots for Clan Ferro-Fibrous',
    formula: '7 slots distributed',
    source: 'TechManual',
    pageReference: 51,
  },
];

/**
 * Heat sink formulas
 */
export const HEAT_SINK_FORMULAS: readonly FormulaDefinition[] = [
  {
    id: 'heat_sinks.integral',
    name: 'Integral Heat Sinks',
    description: 'Free heat sinks from engine',
    formula: 'min(10, floor(Engine Rating / 25))',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'heat_sinks.minimum',
    name: 'Minimum Heat Sinks',
    description: 'Minimum heat sinks required',
    formula: '10 heat sinks',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'heat_sinks.dissipation.single',
    name: 'Single Heat Sink Dissipation',
    description: 'Heat dissipated per single heat sink',
    formula: '1 heat per sink',
    source: 'TechManual',
    pageReference: 50,
  },
  {
    id: 'heat_sinks.dissipation.double',
    name: 'Double Heat Sink Dissipation',
    description: 'Heat dissipated per double heat sink',
    formula: '2 heat per sink',
    source: 'TechManual',
    pageReference: 50,
  },
];

/**
 * Armor formulas
 */
export const ARMOR_FORMULAS: readonly FormulaDefinition[] = [
  {
    id: 'armor.max.standard',
    name: 'Maximum Armor (Standard)',
    description: 'Maximum armor points per location',
    formula: '2 × Internal Structure Points (Head = 9)',
    source: 'TechManual',
    pageReference: 51,
  },
];

/**
 * Get formula by ID
 */
export function getFormula(id: string): FormulaDefinition | undefined {
  const allFormulas = [
    ...WEIGHT_FORMULAS,
    ...MOVEMENT_FORMULAS,
    ...SLOT_FORMULAS,
    ...HEAT_SINK_FORMULAS,
    ...ARMOR_FORMULAS,
  ];

  return allFormulas.find((f) => f.id === id);
}

/**
 * Get all formulas by category
 */
export function getFormulasByCategory(
  category: 'weight' | 'movement' | 'slots' | 'heat_sinks' | 'armor',
): readonly FormulaDefinition[] {
  switch (category) {
    case 'weight':
      return WEIGHT_FORMULAS;
    case 'movement':
      return MOVEMENT_FORMULAS;
    case 'slots':
      return SLOT_FORMULAS;
    case 'heat_sinks':
      return HEAT_SINK_FORMULAS;
    case 'armor':
      return ARMOR_FORMULAS;
    default:
      return [];
  }
}
