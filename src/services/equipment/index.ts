/**
 * Equipment Services Exports
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */

export { EquipmentLookupService, equipmentLookupService } from './EquipmentLookupService';
export type { IEquipmentLookupService } from './EquipmentLookupService';

export { EquipmentCalculatorService, equipmentCalculatorService, VARIABLE_EQUIPMENT } from './EquipmentCalculatorService';
export type { IEquipmentCalculatorService } from './EquipmentCalculatorService';

// Formula system
export { FormulaEvaluator, formulaEvaluator } from './FormulaEvaluator';
export type { IFormulaEvaluator, FormulaContext } from './FormulaEvaluator';

export { FormulaRegistry, formulaRegistry } from './FormulaRegistry';
export type { IFormulaRegistry } from './FormulaRegistry';

export { BUILTIN_FORMULAS, getBuiltinEquipmentIds, hasBuiltinFormulas, getBuiltinFormulas } from './builtinFormulas';

