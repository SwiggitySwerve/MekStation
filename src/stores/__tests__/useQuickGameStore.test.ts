/**
 * Quick Game Store Tests
 * Tests for useQuickGameStore - quick session mode state management.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { act, renderHook } from '@testing-library/react';
import { useQuickGameStore } from '../useQuickGameStore';
import {
  QuickGameStep,
  IQuickGameUnitRequest,
  createQuickGameInstance,
} from '@/types/quickgame';
import { GameStatus, GamePhase, GameEventType } from '@/types/gameplay';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Sample unit for testing
const sampleUnit: IQuickGameUnitRequest = {
  sourceUnitId: 'atlas-as7-d',
  name: 'Atlas AS7-D',
  chassis: 'Atlas',
  variant: 'AS7-D',
  bv: 1897,
  tonnage: 100,
  gunnery: 4,
  piloting: 5,
  maxArmor: { head: 9, ct: 47 },
  maxStructure: { head: 3, ct: 31 },
};

describe('useQuickGameStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useQuickGameStore());
    act(() => {
      result.current.clearGame();
    });
    mockSessionStorage.clear();
  });

  describe('Game Lifecycle', () => {
    it('should start with no game', () => {
      const { result } = renderHook(() => useQuickGameStore());
      expect(result.current.game).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should create a new game with startNewGame', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
      });

      expect(result.current.game).not.toBeNull();
      expect(result.current.game?.id).toMatch(/^quick-/);
      expect(result.current.game?.status).toBe(GameStatus.Setup);
      expect(result.current.game?.step).toBe(QuickGameStep.SelectUnits);
      expect(result.current.game?.playerForce.units).toHaveLength(0);
      expect(result.current.isDirty).toBe(true);
    });

    it('should clear game with clearGame', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
      });

      expect(result.current.game).not.toBeNull();

      act(() => {
        result.current.clearGame();
      });

      expect(result.current.game).toBeNull();
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('Unit Management', () => {
    it('should add unit to player force', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
      });

      expect(result.current.game?.playerForce.units).toHaveLength(1);
      expect(result.current.game?.playerForce.units[0].name).toBe('Atlas AS7-D');
      expect(result.current.game?.playerForce.units[0].bv).toBe(1897);
      expect(result.current.game?.playerForce.totalBV).toBe(1897);
      expect(result.current.game?.playerForce.totalTonnage).toBe(100);
    });

    it('should generate unique instance IDs for units', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
        result.current.addUnit(sampleUnit);
      });

      const units = result.current.game?.playerForce.units ?? [];
      expect(units).toHaveLength(2);
      expect(units[0].instanceId).not.toBe(units[1].instanceId);
    });

    it('should remove unit from player force', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
      });

      const instanceId = result.current.game?.playerForce.units[0].instanceId;

      act(() => {
        result.current.removeUnit(instanceId!);
      });

      expect(result.current.game?.playerForce.units).toHaveLength(0);
      expect(result.current.game?.playerForce.totalBV).toBe(0);
    });

    it('should update unit skills', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
      });

      const instanceId = result.current.game?.playerForce.units[0].instanceId;

      act(() => {
        result.current.updateUnitSkills(instanceId!, 3, 4);
      });

      expect(result.current.game?.playerForce.units[0].gunnery).toBe(3);
      expect(result.current.game?.playerForce.units[0].piloting).toBe(4);
    });

    it('should set error when adding unit without game', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.addUnit(sampleUnit);
      });

      expect(result.current.error).toBe('No active game');
    });
  });

  describe('Scenario Configuration', () => {
    it('should update scenario config', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.setScenarioConfig({ difficulty: 1.5 });
      });

      expect(result.current.game?.scenarioConfig.difficulty).toBe(1.5);
    });

    it('should merge config updates', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.setScenarioConfig({ difficulty: 1.5 });
        result.current.setScenarioConfig({ modifierCount: 3 });
      });

      expect(result.current.game?.scenarioConfig.difficulty).toBe(1.5);
      expect(result.current.game?.scenarioConfig.modifierCount).toBe(3);
    });
  });

  describe('Step Navigation', () => {
    it('should advance to next step', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
      });

      expect(result.current.game?.step).toBe(QuickGameStep.SelectUnits);

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.game?.step).toBe(QuickGameStep.ConfigureScenario);
    });

    it('should not advance if no units selected', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.nextStep();
      });

      expect(result.current.game?.step).toBe(QuickGameStep.SelectUnits);
      expect(result.current.error).toBe('Add at least one unit to continue');
    });

    it('should go back to previous step', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
        result.current.nextStep();
      });

      expect(result.current.game?.step).toBe(QuickGameStep.ConfigureScenario);

      act(() => {
        result.current.previousStep();
      });

      expect(result.current.game?.step).toBe(QuickGameStep.SelectUnits);
    });

    it('should not go before first step', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.previousStep();
      });

      expect(result.current.game?.step).toBe(QuickGameStep.SelectUnits);
    });
  });

  describe('Game Control', () => {
    it('should end game with winner', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
      });

      act(() => {
        result.current.endGame('player', 'destruction');
      });

      expect(result.current.game?.status).toBe(GameStatus.Completed);
      expect(result.current.game?.step).toBe(QuickGameStep.Results);
      expect(result.current.game?.winner).toBe('player');
      expect(result.current.game?.victoryReason).toBe('destruction');
      expect(result.current.game?.endedAt).not.toBeNull();
    });

    it('should record game events', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
      });

      const mockEvent = {
        id: 'event-1',
        gameId: result.current.game!.id,
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: {},
      };

      act(() => {
        result.current.recordEvent(mockEvent);
      });

      expect(result.current.game?.events).toHaveLength(1);
      expect(result.current.game?.events[0].id).toBe('event-1');
    });
  });

  describe('Play Again', () => {
    it('should reset game keeping units', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
        result.current.setScenarioConfig({ difficulty: 1.5 });
        result.current.endGame('player', 'destruction');
      });

      const originalId = result.current.game?.id;

      act(() => {
        result.current.playAgain(false); // Keep units
      });

      expect(result.current.game?.id).not.toBe(originalId);
      expect(result.current.game?.status).toBe(GameStatus.Setup);
      expect(result.current.game?.step).toBe(QuickGameStep.SelectUnits);
      expect(result.current.game?.playerForce.units).toHaveLength(1);
      expect(result.current.game?.scenarioConfig.difficulty).toBe(1.5);
      expect(result.current.game?.winner).toBeNull();
    });

    it('should reset game with fresh units', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
        result.current.endGame('opponent', 'destruction');
      });

      act(() => {
        result.current.playAgain(true); // Reset units
      });

      expect(result.current.game?.playerForce.units).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.addUnit(sampleUnit); // Will set error
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});

describe('Quick Game Helper Functions', () => {
  describe('createQuickGameInstance', () => {
    it('should create valid instance', () => {
      const instance = createQuickGameInstance();

      expect(instance.id).toMatch(/^quick-/);
      expect(instance.status).toBe(GameStatus.Setup);
      expect(instance.step).toBe(QuickGameStep.SelectUnits);
      expect(instance.playerForce.units).toHaveLength(0);
      expect(instance.opponentForce).toBeNull();
      expect(instance.scenario).toBeNull();
      expect(instance.events).toHaveLength(0);
      expect(instance.winner).toBeNull();
      expect(instance.startedAt).toBeDefined();
      expect(instance.endedAt).toBeNull();
    });

    it('should create unique IDs', () => {
      const instance1 = createQuickGameInstance();
      const instance2 = createQuickGameInstance();

      expect(instance1.id).not.toBe(instance2.id);
    });
  });
});
