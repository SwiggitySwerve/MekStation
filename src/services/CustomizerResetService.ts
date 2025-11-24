import { DEFAULT_MECH_STATE, IMechLabState } from '../features/mech-lab/store/MechLabState';
import { calculateMechLabMetrics } from '../features/mech-lab/store/MechLabMetrics';
import { MechValidator } from '../mechanics/Validation';

export type CustomizerResetMode = 'full' | 'equipment' | 'configuration';

export interface ICustomizerResetOptions {
  mode?: CustomizerResetMode;
  preserveEquipmentIds?: string[];
}

export interface ICustomizerResetResult {
  state: IMechLabState;
  removedEquipment: number;
  warnings: string[];
  errors: string[];
  success: boolean;
}

const cloneState = (state: IMechLabState): IMechLabState => JSON.parse(JSON.stringify(state));

const normalizeStateMeta = (state: IMechLabState): IMechLabState => {
  const metrics = calculateMechLabMetrics(state);
  const validation = MechValidator.validate(state, metrics.currentWeight);

  return {
    ...state,
    currentWeight: metrics.currentWeight,
    isValid: validation.isValid,
    validationErrors: validation.errors,
    validationWarnings: validation.warnings,
  };
};

export class CustomizerResetService {
  static reset(state: IMechLabState, options: ICustomizerResetOptions = {}): ICustomizerResetResult {
    const mode = options.mode ?? 'full';
    const preservedIds = new Set(options.preserveEquipmentIds ?? []);
    const workingState = cloneState(state);
    let removedEquipment = 0;

    if (mode === 'full') {
      const resetState: IMechLabState = {
        ...DEFAULT_MECH_STATE,
        tonnage: workingState.tonnage,
        walkingMP: workingState.walkingMP,
        techBase: workingState.techBase,
        rulesLevel: workingState.rulesLevel,
        name: workingState.name,
        model: workingState.model,
      };
      removedEquipment = workingState.equipment.length;
      resetState.equipment = [];
      resetState.criticalSlots = {};
      resetState.armorAllocation = {};
      return {
        state: normalizeStateMeta(resetState),
        removedEquipment,
        warnings: [],
        errors: [],
        success: true,
      };
    }

    if (mode === 'configuration') {
      workingState.structureType = DEFAULT_MECH_STATE.structureType;
      workingState.engineType = DEFAULT_MECH_STATE.engineType;
      workingState.gyroType = DEFAULT_MECH_STATE.gyroType;
      workingState.cockpitType = DEFAULT_MECH_STATE.cockpitType;
      workingState.armorType = DEFAULT_MECH_STATE.armorType;
      workingState.heatSinkType = DEFAULT_MECH_STATE.heatSinkType;
    }

    if (mode === 'equipment' || mode === 'configuration') {
      const retained = workingState.equipment.filter(item => preservedIds.has(item.id));
      removedEquipment = workingState.equipment.length - retained.length;
      workingState.equipment = retained;
      workingState.criticalSlots = {};
    }

    return {
      state: normalizeStateMeta(workingState),
      removedEquipment,
      warnings: [],
      errors: [],
      success: true,
    };
  }
}

