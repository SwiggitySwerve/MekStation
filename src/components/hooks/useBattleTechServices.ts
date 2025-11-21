/**
 * BattleTech Service Hooks - React Integration for SOLID Services
 * 
 * These hooks provide React components with easy access to SOLID services
 * through the ServiceOrchestrator. They handle service lifecycle, real-time
 * updates, and provide a clean API for component integration.
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Each hook handles one specific service concern
 * - Open/Closed: New hooks can be added without modifying existing ones
 * - Liskov Substitution: All service implementations are substitutable
 * - Interface Segregation: Hooks expose only needed functionality
 * - Dependency Inversion: Components depend on hook abstractions
 */

// Note: React types would be available in a real React environment
// For now, we'll mock the React hook types for demonstration
interface MockReactHooks {
  useState: <T>(initialState: T | (() => T)) => [T, (value: T | ((prev: T) => T)) => void];
  useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
  useCallback: <T extends (...args: any[]) => any>(callback: T, deps: any[]) => T;
  useRef: <T>(initialValue: T) => { current: T };
}

declare const React: MockReactHooks;
const { useState, useEffect, useCallback, useRef } = React;
import { ServiceOrchestrator, IServiceOrchestrator } from '../../services/integration/ServiceOrchestrator';
import {
  IComprehensiveCalculationSummary,
  IValidationSummary,
  IHeatCalculationSummary,
  IWeightCalculationSummary,
  IUnitChangeEvent,
  ICalculationUpdateEvent
} from '../../services/integration/ServiceOrchestrator';
import {
  ICompleteUnitState,
  IEquipmentAllocation,
  Result,
  EntityId
} from '../../types/core';

/**
 * Hook configuration interfaces
 */
export interface IBattleTechServiceConfig {
  enableRealTimeUpdates: boolean;
  enableAutoCalculation: boolean;
  enableAutoValidation: boolean;
  calculationThrottleMs: number;
  validationThrottleMs: number;
}

/**
 * Hook result interfaces
 */
export interface IUnitServiceResult {
  unitState: ICompleteUnitState | null;
  isLoading: boolean;
  error: Error | null;
  loadUnit: (unitId: EntityId) => Promise<void>;
  saveUnit: (unitState: ICompleteUnitState) => Promise<void>;
  refreshUnit: () => Promise<void>;
}

export interface IEquipmentServiceResult {
  isLoading: boolean;
  error: Error | null;
  addEquipment: (unitId: EntityId, equipmentId: EntityId, location: string) => Promise<IEquipmentAllocation | null>;
  removeEquipment: (unitId: EntityId, allocationId: EntityId) => Promise<boolean>;
  moveEquipment: (unitId: EntityId, allocationId: EntityId, newLocation: string) => Promise<boolean>;
}

export interface ICalculationServiceResult {
  calculations: IComprehensiveCalculationSummary | null;
  isCalculating: boolean;
  error: Error | null;
  calculateAll: (unitId: EntityId) => Promise<void>;
  calculateHeat: (unitId: EntityId) => Promise<IHeatCalculationSummary | null>;
  calculateWeight: (unitId: EntityId) => Promise<IWeightCalculationSummary | null>;
}

export interface IValidationServiceResult {
  validation: IValidationSummary | null;
  isValidating: boolean;
  error: Error | null;
  validateUnit: (unitId: EntityId) => Promise<void>;
  refreshValidation: () => Promise<void>;
}

/**
 * Global service orchestrator instance
 */
let globalServiceOrchestrator: ServiceOrchestrator | null = null;

/**
 * Initialize the global service orchestrator
 */
async function getServiceOrchestrator(): Promise<ServiceOrchestrator> {
  if (!globalServiceOrchestrator) {
    globalServiceOrchestrator = new ServiceOrchestrator({
      enableRealTimeUpdates: true,
      enableAutoCalculation: true,
      enableAutoValidation: true,
      enableCaching: true
    });
    
    await globalServiceOrchestrator.initialize();
  }
  
  return globalServiceOrchestrator;
}

/**
 * Main BattleTech service hook - provides access to all services
 */
export function useBattleTechServices(config?: Partial<IBattleTechServiceConfig>): {
  orchestrator: IServiceOrchestrator | null;
  isInitialized: boolean;
  error: Error | null;
} {
  const [orchestrator, setOrchestrator] = useState<ServiceOrchestrator | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeOrchestrator() {
      try {
        const serviceOrchestrator = await getServiceOrchestrator();
        
        if (mounted) {
          setOrchestrator(serviceOrchestrator);
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize services'));
          setIsInitialized(false);
        }
      }
    }

    initializeOrchestrator();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    orchestrator,
    isInitialized,
    error
  };
}

/**
 * Unit management hook
 */
export function useUnit(unitId?: EntityId): IUnitServiceResult {
  const [unitState, setUnitState] = useState<ICompleteUnitState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { orchestrator, isInitialized } = useBattleTechServices();

  const loadUnit = useCallback(async (id: EntityId) => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await orchestrator.loadUnit(id);
      
      if (result.success) {
        setUnitState(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load unit'));
    } finally {
      setIsLoading(false);
    }
  }, [orchestrator, isInitialized]);

  const saveUnit = useCallback(async (state: ICompleteUnitState) => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await orchestrator.saveUnit(state);
      
      if (result.success) {
        setUnitState(state);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save unit'));
    } finally {
      setIsLoading(false);
    }
  }, [orchestrator, isInitialized]);

  const refreshUnit = useCallback(async () => {
    if (unitId) {
      await loadUnit(unitId);
    }
  }, [unitId, loadUnit]);

  // Auto-load unit when unitId changes
  useEffect(() => {
    if (unitId && orchestrator && isInitialized) {
      loadUnit(unitId);
    }
  }, [unitId, orchestrator, isInitialized, loadUnit]);

  // Subscribe to unit changes
  useEffect(() => {
    if (!unitId || !orchestrator || !isInitialized) return;

    const unsubscribe = orchestrator.subscribeToUnitChanges(unitId, (event: IUnitChangeEvent) => {
      console.log(`Unit change event: ${event.type}`, event.data);
      
      // Refresh unit state on relevant changes
      if (event.type === 'unit_saved' || event.type === 'equipment_added' || 
          event.type === 'equipment_removed' || event.type === 'equipment_moved') {
        refreshUnit();
      }
    });

    return unsubscribe;
  }, [unitId, orchestrator, isInitialized, refreshUnit]);

  return {
    unitState,
    isLoading,
    error,
    loadUnit,
    saveUnit,
    refreshUnit
  };
}

/**
 * Equipment management hook
 */
export function useEquipment(): IEquipmentServiceResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { orchestrator, isInitialized } = useBattleTechServices();

  const addEquipment = useCallback(async (
    unitId: EntityId,
    equipmentId: EntityId,
    location: string
  ): Promise<IEquipmentAllocation | null> => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await orchestrator.addEquipment(unitId, equipmentId, location);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add equipment'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [orchestrator, isInitialized]);

  const removeEquipment = useCallback(async (
    unitId: EntityId,
    allocationId: EntityId
  ): Promise<boolean> => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await orchestrator.removeEquipment(unitId, allocationId);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove equipment'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [orchestrator, isInitialized]);

  const moveEquipment = useCallback(async (
    unitId: EntityId,
    allocationId: EntityId,
    newLocation: string
  ): Promise<boolean> => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await orchestrator.moveEquipment(unitId, allocationId, newLocation);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to move equipment'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [orchestrator, isInitialized]);

  return {
    isLoading,
    error,
    addEquipment,
    removeEquipment,
    moveEquipment
  };
}

/**
 * Calculation services hook
 */
export function useCalculations(unitId?: EntityId): ICalculationServiceResult {
  const [calculations, setCalculations] = useState<IComprehensiveCalculationSummary | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { orchestrator, isInitialized } = useBattleTechServices();

  const calculateAll = useCallback(async (id: EntityId) => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const result = await orchestrator.calculateAll(id);
      
      if (result.success) {
        setCalculations(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to calculate'));
    } finally {
      setIsCalculating(false);
    }
  }, [orchestrator, isInitialized]);

  const calculateHeat = useCallback(async (id: EntityId): Promise<IHeatCalculationSummary | null> => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return null;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const result = await orchestrator.calculateHeat(id);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to calculate heat'));
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [orchestrator, isInitialized]);

  const calculateWeight = useCallback(async (id: EntityId): Promise<IWeightCalculationSummary | null> => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return null;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const result = await orchestrator.calculateWeight(id);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to calculate weight'));
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [orchestrator, isInitialized]);

  // Auto-calculate when unit changes
  useEffect(() => {
    if (unitId && orchestrator && isInitialized) {
      calculateAll(unitId);
    }
  }, [unitId, orchestrator, isInitialized, calculateAll]);

  // Subscribe to calculation updates
  useEffect(() => {
    if (!unitId || !orchestrator || !isInitialized) return;

    const unsubscribe = orchestrator.subscribeToCalculationUpdates(unitId, (event: ICalculationUpdateEvent) => {
      console.log(`Calculation update: ${event.type}`, event.calculations);
      
      if (event.type === 'all_updated' && event.calculations) {
        setCalculations(event.calculations);
      }
    });

    return unsubscribe;
  }, [unitId, orchestrator, isInitialized]);

  return {
    calculations,
    isCalculating,
    error,
    calculateAll,
    calculateHeat,
    calculateWeight
  };
}

/**
 * Validation services hook
 */
export function useValidation(unitId?: EntityId): IValidationServiceResult {
  const [validation, setValidation] = useState<IValidationSummary | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { orchestrator, isInitialized } = useBattleTechServices();

  const validateUnit = useCallback(async (id: EntityId) => {
    if (!orchestrator || !isInitialized) {
      setError(new Error('Services not initialized'));
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await orchestrator.validateUnit(id);
      
      if (result.success) {
        setValidation(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to validate unit'));
    } finally {
      setIsValidating(false);
    }
  }, [orchestrator, isInitialized]);

  const refreshValidation = useCallback(async () => {
    if (unitId) {
      await validateUnit(unitId);
    }
  }, [unitId, validateUnit]);

  // Auto-validate when unit changes
  useEffect(() => {
    if (unitId && orchestrator && isInitialized) {
      validateUnit(unitId);
    }
  }, [unitId, orchestrator, isInitialized, validateUnit]);

  return {
    validation,
    isValidating,
    error,
    validateUnit,
    refreshValidation
  };
}

/**
 * Real-time unit monitoring hook
 */
export function useUnitMonitoring(unitId: EntityId): {
  unitChanges: IUnitChangeEvent[];
  calculationUpdates: ICalculationUpdateEvent[];
  clearHistory: () => void;
} {
  const [unitChanges, setUnitChanges] = useState<IUnitChangeEvent[]>([]);
  const [calculationUpdates, setCalculationUpdates] = useState<ICalculationUpdateEvent[]>([]);
  const { orchestrator, isInitialized } = useBattleTechServices();
  const maxHistoryLength = 100;

  const clearHistory = useCallback(() => {
    setUnitChanges([]);
    setCalculationUpdates([]);
  }, []);

  // Subscribe to unit changes
  useEffect(() => {
    if (!unitId || !orchestrator || !isInitialized) return;

    const unsubscribe = orchestrator.subscribeToUnitChanges(unitId, (event: IUnitChangeEvent) => {
      setUnitChanges((prev: IUnitChangeEvent[]) => {
        const newChanges = [event, ...prev];
        return newChanges.slice(0, maxHistoryLength);
      });
    });

    return unsubscribe;
  }, [unitId, orchestrator, isInitialized]);

  // Subscribe to calculation updates
  useEffect(() => {
    if (!unitId || !orchestrator || !isInitialized) return;

    const unsubscribe = orchestrator.subscribeToCalculationUpdates(unitId, (event: ICalculationUpdateEvent) => {
      setCalculationUpdates((prev: ICalculationUpdateEvent[]) => {
        const newUpdates = [event, ...prev];
        return newUpdates.slice(0, maxHistoryLength);
      });
    });

    return unsubscribe;
  }, [unitId, orchestrator, isInitialized]);

  return {
    unitChanges,
    calculationUpdates,
    clearHistory
  };
}

/**
 * Service health monitoring hook
 */
export function useServiceHealth(): {
  isHealthy: boolean;
  errors: Error[];
  warnings: string[];
  performance: {
    averageResponseTime: number;
    totalRequests: number;
    failureRate: number;
  };
} {
  const [isHealthy, setIsHealthy] = useState(true);
  const [errors, setErrors] = useState<Error[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [performance, setPerformance] = useState({
    averageResponseTime: 0,
    totalRequests: 0,
    failureRate: 0
  });

  const { orchestrator, isInitialized, error } = useBattleTechServices();

  useEffect(() => {
    if (error) {
      setIsHealthy(false);
      setErrors((prev: Error[]) => [error, ...prev.slice(0, 9)]); // Keep last 10 errors
    } else if (isInitialized) {
      setIsHealthy(true);
    }
  }, [error, isInitialized]);

  // TODO: Implement actual service health monitoring
  // This would involve tracking service response times, error rates, etc.

  return {
    isHealthy,
    errors,
    warnings,
    performance
  };
}

/**
 * Cleanup hook for service orchestrator
 */
export function useServiceCleanup(): () => Promise<void> {
  return useCallback(async () => {
    if (globalServiceOrchestrator) {
      await globalServiceOrchestrator.cleanup();
      globalServiceOrchestrator = null;
    }
  }, []);
}

/**
 * Development utilities hook
 */
export function useServiceDevTools(): {
  dumpServiceState: () => any;
  resetServices: () => Promise<void>;
  enableDebugMode: (enabled: boolean) => void;
} {
  const { orchestrator } = useBattleTechServices();

  const dumpServiceState = useCallback(() => {
    if (!orchestrator) return null;
    
    return {
      orchestrator: orchestrator.constructor.name,
      isInitialized: !!orchestrator,
      // Add more debugging info as needed
    };
  }, [orchestrator]);

  const resetServices = useCallback(async () => {
    if (globalServiceOrchestrator) {
      await globalServiceOrchestrator.cleanup();
      globalServiceOrchestrator = null;
    }
    // Force re-initialization on next access
  }, []);

  const enableDebugMode = useCallback((enabled: boolean) => {
    // TODO: Implement debug mode toggle
    console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  return {
    dumpServiceState,
    resetServices,
    enableDebugMode
  };
}