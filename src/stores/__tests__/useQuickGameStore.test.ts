/**
 * Quick Game Store Tests
 * Tests for useQuickGameStore - quick session mode state management.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { GameStatus, GamePhase, GameEventType } from '@/types/gameplay';
import {
  QuickGameStep,
  IQuickGameUnitRequest,
  createQuickGameInstance,
} from '@/types/quickgame';

import { useQuickGameStore } from '../useQuickGameStore';

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
      expect(result.current.game?.playerForce.units[0].name).toBe(
        'Atlas AS7-D',
      );
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

    it('should generate scenario with OpFor', async () => {
      const { result } = renderHook(() => useQuickGameStore());

      act(() => {
        result.current.startNewGame();
        result.current.addUnit(sampleUnit);
      });

      act(() => {
        result.current.generateScenario();
      });

      // Wait for async scenario generation to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.game?.scenario).not.toBeNull();
      expect(result.current.game?.opponentForce).not.toBeNull();
      expect(result.current.game?.opponentForce?.units.length).toBeGreaterThan(
        0,
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
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

describe('Event Tracking and Replay', () => {
  it('should record multiple events in order', () => {
    const { result } = renderHook(() => useQuickGameStore());

    act(() => {
      result.current.startNewGame();
    });

    const gameId = result.current.game!.id;

    // Record multiple events
    const events = [
      {
        id: 'event-1',
        gameId,
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameCreated,
        turn: 0,
        phase: GamePhase.Initiative,
        payload: {},
      },
      {
        id: 'event-2',
        gameId,
        sequence: 2,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: {},
      },
      {
        id: 'event-3',
        gameId,
        sequence: 3,
        timestamp: new Date().toISOString(),
        type: GameEventType.TurnStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: {},
      },
    ];

    act(() => {
      events.forEach((event) => result.current.recordEvent(event));
    });

    expect(result.current.game?.events).toHaveLength(3);
    expect(result.current.game?.events[0].sequence).toBe(1);
    expect(result.current.game?.events[1].sequence).toBe(2);
    expect(result.current.game?.events[2].sequence).toBe(3);
  });

  it('should preserve events after game ends', () => {
    const { result } = renderHook(() => useQuickGameStore());

    act(() => {
      result.current.startNewGame();
    });

    const gameId = result.current.game!.id;

    // Record an event
    act(() => {
      result.current.recordEvent({
        id: 'event-1',
        gameId,
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: {},
      });
    });

    // End the game
    act(() => {
      result.current.endGame('player', 'elimination');
    });

    // Events should still be there
    expect(result.current.game?.events).toHaveLength(1);
    expect(result.current.game?.status).toBe(GameStatus.Completed);
  });

  it('should clear events when starting a new game', () => {
    const { result } = renderHook(() => useQuickGameStore());

    act(() => {
      result.current.startNewGame();
    });

    const gameId = result.current.game!.id;

    // Record events
    act(() => {
      result.current.recordEvent({
        id: 'event-1',
        gameId,
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: {},
      });
    });

    expect(result.current.game?.events).toHaveLength(1);

    // Start a new game
    act(() => {
      result.current.startNewGame();
    });

    // New game should have no events
    expect(result.current.game?.events).toHaveLength(0);
  });

  it('should clear events on playAgain', () => {
    const { result } = renderHook(() => useQuickGameStore());

    act(() => {
      result.current.startNewGame();
      result.current.addUnit(sampleUnit);
    });

    const gameId = result.current.game!.id;

    // Record events and end game
    act(() => {
      result.current.recordEvent({
        id: 'event-1',
        gameId,
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: {},
      });
      result.current.endGame('player', 'elimination');
    });

    expect(result.current.game?.events).toHaveLength(1);

    // Play again
    act(() => {
      result.current.playAgain(false);
    });

    // New game instance should have no events
    expect(result.current.game?.events).toHaveLength(0);
    expect(result.current.game?.id).not.toBe(gameId);
  });
});

describe('Session Persistence Cleanup', () => {
  it('should clear game state from session storage on clearGame', () => {
    const { result } = renderHook(() => useQuickGameStore());

    act(() => {
      result.current.startNewGame();
      result.current.addUnit(sampleUnit);
    });

    // Verify game exists
    expect(result.current.game).not.toBeNull();

    // Clear the game
    act(() => {
      result.current.clearGame();
    });

    // Game should be null
    expect(result.current.game).toBeNull();

    // Check that session storage is cleared
    // The zustand persist middleware will update the storage
    const storedData = mockSessionStorage.getItem('mekstation-quick-game');
    if (storedData) {
      const parsed = JSON.parse(storedData) as { state?: { game: unknown } };
      expect(parsed.state?.game).toBeNull();
    }
  });

  it('should not persist game state after explicit clear', () => {
    const { result: result1 } = renderHook(() => useQuickGameStore());

    act(() => {
      result1.current.startNewGame();
      result1.current.addUnit(sampleUnit);
    });

    // Clear the game
    act(() => {
      result1.current.clearGame();
    });

    // Create a new hook instance (simulating page refresh)
    const { result: result2 } = renderHook(() => useQuickGameStore());

    // Should not have a game
    expect(result2.current.game).toBeNull();
  });

  it('should have independent game instances', () => {
    const { result } = renderHook(() => useQuickGameStore());

    // Create first game
    act(() => {
      result.current.startNewGame();
    });
    const firstGameId = result.current.game?.id;

    // Create second game
    act(() => {
      result.current.startNewGame();
    });
    const secondGameId = result.current.game?.id;

    // IDs should be different
    expect(firstGameId).not.toBe(secondGameId);
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
