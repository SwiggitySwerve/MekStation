export { EntityIdRequired } from './EntityIdRequired';
export { EntityNameRequired } from './EntityNameRequired';
export { ValidUnitType } from './ValidUnitType';
export { TechBaseRequired } from './TechBaseRequired';
export { RulesLevelRequired } from './RulesLevelRequired';
export { IntroductionYearValid } from './IntroductionYearValid';
export { TemporalConsistency } from './TemporalConsistency';
export { WeightNonNegative } from './WeightNonNegative';
export { CostNonNegative } from './CostNonNegative';
export { BattleValueNonNegative } from './BattleValueNonNegative';
export { EraAvailability } from './EraAvailability';
export { RulesLevelCompliance } from './RulesLevelCompliance';
export { ArmorAllocationValidation } from './ArmorAllocationValidation';
export { WeightOverflowValidation } from './WeightOverflowValidation';
export { CriticalSlotOverflowValidation } from './CriticalSlotOverflowValidation';

import type { IUnitValidationRuleDefinition } from '../../../../types/validation/UnitValidationInterfaces';

import { ArmorAllocationValidation } from './ArmorAllocationValidation';
import { BattleValueNonNegative } from './BattleValueNonNegative';
import { CostNonNegative } from './CostNonNegative';
import { CriticalSlotOverflowValidation } from './CriticalSlotOverflowValidation';
import { EntityIdRequired } from './EntityIdRequired';
import { EntityNameRequired } from './EntityNameRequired';
import { EraAvailability } from './EraAvailability';
import { IntroductionYearValid } from './IntroductionYearValid';
import { RulesLevelCompliance } from './RulesLevelCompliance';
import { RulesLevelRequired } from './RulesLevelRequired';
import { TechBaseRequired } from './TechBaseRequired';
import { TemporalConsistency } from './TemporalConsistency';
import { ValidUnitType } from './ValidUnitType';
import { WeightNonNegative } from './WeightNonNegative';
import { WeightOverflowValidation } from './WeightOverflowValidation';

export const UNIVERSAL_VALIDATION_RULES: readonly IUnitValidationRuleDefinition[] =
  [
    EntityIdRequired,
    EntityNameRequired,
    ValidUnitType,
    TechBaseRequired,
    RulesLevelRequired,
    IntroductionYearValid,
    TemporalConsistency,
    WeightNonNegative,
    CostNonNegative,
    BattleValueNonNegative,
    EraAvailability,
    RulesLevelCompliance,
    ArmorAllocationValidation,
    WeightOverflowValidation,
    CriticalSlotOverflowValidation,
  ];

export const ArmorAllocationWarning = ArmorAllocationValidation;
