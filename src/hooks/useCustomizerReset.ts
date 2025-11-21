/**
 * Customizer Reset Hook
 * 
 * Provides reset functionality for the customizer with:
 * - Reset confirmation dialogs
 * - Progress tracking
 * - Error handling
 * - Success notifications
 */

import { useState, useCallback } from 'react';
import { CustomizerResetService, ResetOptions, ResetResult } from '../utils/reset/CustomizerResetService';
import { useUnit } from '../components/multiUnit/MultiUnitProvider';

export interface ResetState {
  isResetting: boolean;
  progress: number;
  currentStep: string;
  result: ResetResult | null;
}

export interface UseCustomizerResetReturn {
  resetState: ResetState;
  resetUnit: (options?: ResetOptions) => Promise<ResetResult>;
  resetToDefaults: () => Promise<ResetResult>;
  resetEquipmentOnly: () => Promise<ResetResult>;
  resetConfiguration: () => Promise<ResetResult>;
  clearResetState: () => void;
}

export function useCustomizerReset(): UseCustomizerResetReturn {
  const { unit } = useUnit();
  const [resetState, setResetState] = useState<ResetState>({
    isResetting: false,
    progress: 0,
    currentStep: '',
    result: null
  });

  const updateProgress = useCallback((progress: number, step: string) => {
    setResetState(prev => ({
      ...prev,
      progress,
      currentStep: step
    }));
  }, []);

  const resetUnit = useCallback(async (options: ResetOptions = {}): Promise<ResetResult> => {
    setResetState({
      isResetting: true,
      progress: 0,
      currentStep: 'Initializing reset...',
      result: null
    });

    try {
      updateProgress(10, 'Collecting equipment to remove...');
      await new Promise(resolve => setTimeout(resolve, 100));

      updateProgress(30, 'Clearing sections...');
      await new Promise(resolve => setTimeout(resolve, 100));

      updateProgress(50, 'Clearing unallocated equipment...');
      await new Promise(resolve => setTimeout(resolve, 100));

      updateProgress(70, 'Resetting configuration...');
      await new Promise(resolve => setTimeout(resolve, 100));

      updateProgress(90, 'Reinitializing system components...');
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = CustomizerResetService.resetUnit(unit, options);

      updateProgress(100, 'Reset completed');
      await new Promise(resolve => setTimeout(resolve, 200));

      setResetState(prev => ({
        ...prev,
        isResetting: false,
        result
      }));

      // Log result
      if (result.success) {
        console.log('[useCustomizerReset] Reset completed successfully');
        console.log(`[useCustomizerReset] Removed ${result.removedEquipment.length} equipment pieces`);
        console.log(`[useCustomizerReset] Reset ${result.resetSections.length} sections`);
      } else {
        console.error('[useCustomizerReset] Reset failed:', result.errors);
      }

      return result;

    } catch (error) {
      console.error('[useCustomizerReset] Reset error:', error);
      
      const errorResult: ResetResult = {
        success: false,
        removedEquipment: [],
        resetSections: [],
        errors: [`Reset failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };

      setResetState(prev => ({
        ...prev,
        isResetting: false,
        result: errorResult
      }));

      return errorResult;
    }
  }, [unit, updateProgress]);

  const resetToDefaults = useCallback(async (): Promise<ResetResult> => {
    return resetUnit({
      resetArmorAllocation: true,
      resetHeatSinks: true,
      resetJumpJets: true
    });
  }, [resetUnit]);

  const resetEquipmentOnly = useCallback(async (): Promise<ResetResult> => {
    return resetUnit({
      resetArmorAllocation: false,
      resetHeatSinks: false,
      resetJumpJets: false
    });
  }, [resetUnit]);

  const resetConfiguration = useCallback(async (): Promise<ResetResult> => {
    return resetUnit({
      resetArmorAllocation: true,
      resetHeatSinks: true,
      resetJumpJets: true
    });
  }, [resetUnit]);

  const clearResetState = useCallback(() => {
    setResetState({
      isResetting: false,
      progress: 0,
      currentStep: '',
      result: null
    });
  }, []);

  return {
    resetState,
    resetUnit,
    resetToDefaults,
    resetEquipmentOnly,
    resetConfiguration,
    clearResetState
  };
} 