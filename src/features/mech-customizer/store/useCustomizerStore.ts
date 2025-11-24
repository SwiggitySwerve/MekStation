import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import {
  DEFAULT_MECH_STATE,
  IMechLabActions,
  IMechLabState,
  IInstalledEquipmentState,
} from '../../mech-lab/store/MechLabState';
import {
  calculateMechLabMetrics,
  IMechLabMetrics,
} from '../../mech-lab/store/MechLabMetrics';
import { IValidationResult, MechValidator } from '../../../mechanics/Validation';
import {
  CustomizerResetMode,
  CustomizerResetService,
  ICustomizerResetResult,
} from '../../../services/CustomizerResetService';
import { TechBase } from '../../../types/TechBase';
import {
  EngineType,
  GyroType,
  CockpitType,
  StructureType,
  ArmorType,
  HeatSinkType,
} from '../../../types/SystemComponents';
import { getWeaponById } from '../../../data/weapons';

export type CustomizerTabId =
  | 'overview'
  | 'structure'
  | 'armor'
  | 'equipment'
  | 'criticals'
  | 'fluff';

interface CustomizerStoreState {
  unit: IMechLabState;
  metrics: IMechLabMetrics;
  validation: IValidationResult;
  activeTab: CustomizerTabId;
  isEquipmentTrayExpanded: boolean;
  isDebugVisible: boolean;
}

interface CustomizerStoreActions extends IMechLabActions {
  setActiveTab(tab: CustomizerTabId): void;
  toggleEquipmentTray(): void;
  toggleDebug(): void;
  resetUnit(mode?: CustomizerResetMode): ICustomizerResetResult;
  loadUnit(unit: IMechLabState): void;
  updateUnit(partial: Partial<IMechLabState>): void;
}

export type CustomizerStore = CustomizerStoreState & CustomizerStoreActions;

type CustomizerActions = Pick<
  IMechLabActions,
  | 'setTonnage'
  | 'setTechBase'
  | 'setWalkingMP'
  | 'setStructureType'
  | 'setEngineType'
  | 'setGyroType'
  | 'setCockpitType'
  | 'setArmorType'
  | 'setHeatSinkType'
  | 'setArmorAllocation'
  | 'setFluffNotes'
  | 'addEquipment'
  | 'removeEquipment'
  | 'assignEquipment'
  | 'unassignEquipment'
>;

interface ICustomizerViewModel {
  unit: IMechLabState;
  metrics: IMechLabMetrics;
  validation: IValidationResult;
  actions: CustomizerActions;
}

const enrichState = (unit: IMechLabState) => {
  const metrics = calculateMechLabMetrics(unit);
  const validation = MechValidator.validate(unit, metrics.currentWeight);
  const nextUnit: IMechLabState = {
    ...unit,
    currentWeight: metrics.currentWeight,
    isValid: validation.isValid,
    validationErrors: validation.errors,
    validationWarnings: validation.warnings,
  };

  return {
    unit: nextUnit,
    metrics,
    validation,
  };
};

const createEquipmentInstance = (equipmentId: string): IInstalledEquipmentState => {
  const def = getWeaponById(equipmentId);
  return {
    id: crypto.randomUUID(),
    equipmentId,
    location: 'unallocated',
    slotIndex: -1,
    count: 1,
    slotsAllocated: def?.criticalSlots ?? 0,
  };
};

export const useCustomizerStore = create<CustomizerStore>((set, get) => {
  const initial = enrichState(DEFAULT_MECH_STATE);

  const applyUnitUpdate = (updater: (unit: IMechLabState) => IMechLabState) => {
    set(state => {
      const updated = updater(state.unit);
      const recalculated = enrichState(updated);
      return {
        ...state,
        ...recalculated,
      };
    });
  };

  return {
    ...initial,
    activeTab: 'overview',
    isEquipmentTrayExpanded: false,
    isDebugVisible: false,
    setActiveTab: (tab: CustomizerTabId) => set({ activeTab: tab }),
    toggleEquipmentTray: () =>
      set(state => ({ isEquipmentTrayExpanded: !state.isEquipmentTrayExpanded })),
    toggleDebug: () => set(state => ({ isDebugVisible: !state.isDebugVisible })),
    setTonnage: (tonnage: number) => applyUnitUpdate(unit => ({ ...unit, tonnage })),
    setTechBase: (techBase: TechBase) => applyUnitUpdate(unit => ({ ...unit, techBase })),
    setWalkingMP: (mp: number) => applyUnitUpdate(unit => ({ ...unit, walkingMP: mp })),
    setStructureType: (type: StructureType) =>
      applyUnitUpdate(unit => ({ ...unit, structureType: type })),
    setEngineType: (type: EngineType) => applyUnitUpdate(unit => ({ ...unit, engineType: type })),
    setGyroType: (type: GyroType) => applyUnitUpdate(unit => ({ ...unit, gyroType: type })),
    setCockpitType: (type: CockpitType) =>
      applyUnitUpdate(unit => ({ ...unit, cockpitType: type })),
    setArmorType: (type: ArmorType) => applyUnitUpdate(unit => ({ ...unit, armorType: type })),
    setHeatSinkType: (type: HeatSinkType) =>
      applyUnitUpdate(unit => ({ ...unit, heatSinkType: type })),
    setArmorAllocation: (location, allocation) =>
      applyUnitUpdate(unit => ({
        ...unit,
        armorAllocation: {
          ...unit.armorAllocation,
          [location]: allocation,
        },
      })),
    setFluffNotes: (notes: string) => applyUnitUpdate(unit => ({ ...unit, fluffNotes: notes })),
    addEquipment: (equipmentId: string) =>
      applyUnitUpdate(unit => ({
        ...unit,
        equipment: [...unit.equipment, createEquipmentInstance(equipmentId)],
      })),
    removeEquipment: (instanceId: string) =>
      applyUnitUpdate(unit => ({
        ...unit,
        equipment: unit.equipment.filter(item => item.id !== instanceId),
      })),
    assignEquipment: (instanceId: string, location: string, slotIndex: number) =>
      applyUnitUpdate(unit => ({
        ...unit,
        equipment: unit.equipment.map(item =>
          item.id === instanceId ? { ...item, location, slotIndex } : item
        ),
      })),
    unassignEquipment: (instanceId: string) =>
      applyUnitUpdate(unit => ({
        ...unit,
        equipment: unit.equipment.map(item =>
          item.id === instanceId ? { ...item, location: 'unallocated', slotIndex: -1 } : item
        ),
      })),
    resetUnit: (mode: CustomizerResetMode = 'full') => {
      const resetResult = CustomizerResetService.reset(get().unit, { mode });
      set(state => ({
        ...state,
        ...enrichState(resetResult.state),
      }));
      return resetResult;
    },
    loadUnit: (nextUnit: IMechLabState) => {
      set(state => ({
        ...state,
        ...enrichState(nextUnit),
      }));
    },
    updateUnit: (partial: Partial<IMechLabState>) => {
      applyUnitUpdate(unit => ({
        ...unit,
        ...partial,
      }));
    },
  };
});

export const useCustomizerViewModel = (): ICustomizerViewModel => {
  const unit = useCustomizerStore(state => state.unit);
  const metrics = useCustomizerStore(state => state.metrics);
  const validation = useCustomizerStore(state => state.validation);
  const actions = useCustomizerStore<CustomizerActions>(
    ({
      setTonnage,
      setTechBase,
      setWalkingMP,
      setStructureType,
      setEngineType,
      setGyroType,
      setCockpitType,
      setArmorType,
      setHeatSinkType,
      setArmorAllocation,
      setFluffNotes,
      addEquipment,
      removeEquipment,
      assignEquipment,
      unassignEquipment,
    }) => ({
      setTonnage,
      setTechBase,
      setWalkingMP,
      setStructureType,
      setEngineType,
      setGyroType,
      setCockpitType,
      setArmorType,
      setHeatSinkType,
      setArmorAllocation,
      setFluffNotes,
      addEquipment,
      removeEquipment,
      assignEquipment,
      unassignEquipment,
    }),
    shallow
  );

  return { unit, metrics, validation, actions };
};

