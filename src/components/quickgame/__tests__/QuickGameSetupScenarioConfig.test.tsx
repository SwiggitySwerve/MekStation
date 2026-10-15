/**
 * QuickGameSetupScenarioConfig — selection and generation tests
 *
 * Per `polish-wave-6.2-gaps` (gaps #4 + #6): the Scenario Type and AI Tier
 * Selects update `useQuickGameStore.scenarioConfig`; generation tests exercise
 * the real store action, scenario generator and opposing pilot construction.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { GameStatus, GamePhase } from '@/types/gameplay';
import {
  createQuickGameUnit,
  QuickGameStep,
} from '@/types/quickgame/QuickGameInterfaces';
import { ScenarioObjectiveType } from '@/types/scenario';

import { ScenarioConfigStep } from '../QuickGameSetupScenarioConfig';

function seedGameWithStep() {
  useQuickGameStore.setState({
    game: {
      id: 'qg-test',
      status: GameStatus.Setup,
      step: QuickGameStep.ConfigureScenario,
      playerForce: {
        name: 'Player Force',
        units: [
          {
            instanceId: 'u1',
            sourceUnitId: 'atlas-as7d',
            name: 'Atlas AS7-D',
            chassis: 'Atlas',
            variant: 'AS7-D',
            bv: 1897,
            tonnage: 100,
            gunnery: 4,
            piloting: 5,
            maxArmor: { center_torso: 31 },
            maxStructure: { center_torso: 21 },
            armor: { center_torso: 31 },
            structure: { center_torso: 21 },
            heat: 0,
            isDestroyed: false,
            isWithdrawn: false,
          },
        ],
        totalBV: 1897,
        totalTonnage: 100,
      },
      opponentForce: null,
      scenarioConfig: {
        difficulty: 1.0,
        modifierCount: 2,
        allowNegativeModifiers: true,
        year: 3025,
      },
      scenario: null,
      phase: GamePhase.Initiative,
      turn: 0,
      events: [],
      winner: null,
      victoryReason: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
    },
    isLoading: false,
  });
}

describe('ScenarioConfigStep — Scenario Type + AI Tier selectors', () => {
  beforeEach(() => {
    seedGameWithStep();
  });

  it('renders the scenario-type selector with the four archetypes and defaults to Annihilation', () => {
    render(<ScenarioConfigStep />);
    const select = screen.getByTestId(
      'quick-game-scenario-select',
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('Annihilation');
    // four options
    expect(select.querySelectorAll('option')).toHaveLength(4);
  });

  it('renders the AI-tier selector with the four tiers and defaults to Regular', () => {
    render(<ScenarioConfigStep />);
    const select = screen.getByTestId(
      'quick-game-ai-tier-select',
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('Regular');
    expect(select.querySelectorAll('option')).toHaveLength(4);
  });

  it('changing the scenario-type selector updates useQuickGameStore.scenarioConfig.scenarioType', () => {
    render(<ScenarioConfigStep />);
    const select = screen.getByTestId(
      'quick-game-scenario-select',
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Defend' } });

    const stored =
      useQuickGameStore.getState().game?.scenarioConfig.scenarioType;
    expect(stored).toBe('Defend');
  });

  it('changing the AI-tier selector updates useQuickGameStore.scenarioConfig.aiTier', () => {
    render(<ScenarioConfigStep />);
    const select = screen.getByTestId(
      'quick-game-ai-tier-select',
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Elite' } });

    const stored = useQuickGameStore.getState().game?.scenarioConfig.aiTier;
    expect(stored).toBe('Elite');
  });

  it('both selectors update independently — changing one does not clobber the other', () => {
    render(<ScenarioConfigStep />);
    fireEvent.change(screen.getByTestId('quick-game-scenario-select'), {
      target: { value: 'CTF' },
    });
    fireEvent.change(screen.getByTestId('quick-game-ai-tier-select'), {
      target: { value: 'Veteran' },
    });

    const cfg = useQuickGameStore.getState().game?.scenarioConfig;
    expect(cfg?.scenarioType).toBe('CTF');
    expect(cfg?.aiTier).toBe('Veteran');
  });
});

describe('ScenarioConfigStep generates the selected scenario and opposing pilots', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(54321);
    seedGameWithStep();
  });

  afterEach(() => {
    cleanup();
    useQuickGameStore.getState().clearGame();
    jest.useRealTimers();
  });

  function configureForce(unitCount: number, difficulty = 1) {
    const game = useQuickGameStore.getState().game;
    if (!game) throw new Error('The test requires an active Quick Game.');
    const units = Array.from({ length: unitCount }, () =>
      createQuickGameUnit({
        sourceUnitId: 'locust-lct-1v',
        name: 'Locust LCT-1V',
        chassis: 'Locust',
        variant: 'LCT-1V',
        bv: 432,
        tonnage: 20,
        gunnery: 4,
        piloting: 5,
        maxArmor: {},
        maxStructure: {},
      }),
    );
    useQuickGameStore.setState({
      game: {
        ...game,
        playerForce: {
          name: 'Player Force',
          units,
          totalBV: unitCount * 432,
          totalTonnage: unitCount * 20,
        },
        scenarioConfig: {
          ...game.scenarioConfig,
          difficulty,
          modifierCount: 0,
        },
      },
    });
  }

  function generate() {
    fireEvent.click(screen.getByTestId('generate-scenario-btn'));
    act(() => jest.runOnlyPendingTimers());
    const { game, error, isLoading } = useQuickGameStore.getState();
    expect(error).toBeNull();
    expect(isLoading).toBe(false);
    if (!game?.scenario || !game.opponentForce)
      throw new Error(
        'Generate Scenario did not produce a scenario and opponent.',
      );
    return { game, scenario: game.scenario, opponent: game.opponentForce };
  }

  function difficultySlider() {
    const slider = screen
      .getAllByRole('slider')
      .find((input) => input.getAttribute('max') === '2');
    if (!slider) throw new Error('The difficulty slider is missing.');
    return slider;
  }

  it('rejects the single 20-ton Elite half-difficulty empty force and allows a valid retry', () => {
    configureForce(1, 0.5);
    render(<ScenarioConfigStep />);
    fireEvent.change(screen.getByTestId('quick-game-ai-tier-select'), {
      target: { value: 'Elite' },
    });

    fireEvent.click(screen.getByTestId('generate-scenario-btn'));
    act(() => jest.runOnlyPendingTimers());

    const failed = useQuickGameStore.getState();
    expect(failed.error).toMatch(/BV.*difficulty.*tier/i);
    expect(failed.game?.scenario).toBeNull();
    expect(failed.game?.opponentForce).toBeNull();
    expect(failed.game?.step).toBe(QuickGameStep.ConfigureScenario);
    expect(failed.game?.scenarioConfig.aiTier).toBe('Elite');
    expect(failed.isLoading).toBe(false);

    fireEvent.change(difficultySlider(), { target: { value: '2' } });
    const retried = generate();
    expect(retried.opponent.units.length).toBeGreaterThan(0);
    expect(retried.game.step).toBe(QuickGameStep.Review);
  });

  it('retains the previous valid scenario without advancing on a failed regeneration', () => {
    configureForce(1, 2);
    render(<ScenarioConfigStep />);
    fireEvent.change(screen.getByTestId('quick-game-ai-tier-select'), {
      target: { value: 'Elite' },
    });
    const previous = generate();
    act(() => useQuickGameStore.getState().previousStep());
    fireEvent.change(difficultySlider(), { target: { value: '0.5' } });

    fireEvent.click(screen.getByTestId('generate-scenario-btn'));
    act(() => jest.runOnlyPendingTimers());

    const failed = useQuickGameStore.getState();
    expect(failed.game?.scenario).toBe(previous.scenario);
    expect(failed.game?.opponentForce).toBe(previous.opponent);
    expect(failed.game?.step).toBe(QuickGameStep.ConfigureScenario);
    expect(failed.error).toMatch(/BV.*difficulty.*tier/i);
    expect(failed.isLoading).toBe(false);
  });

  it.each([
    ['Defend', 1, ScenarioObjectiveType.Defend, 54321],
    ['Defend', 2, ScenarioObjectiveType.Defend, 2000],
    ['Annihilation', 4, ScenarioObjectiveType.Destroy, 54321],
    ['CTF', 4, ScenarioObjectiveType.Capture, 2000],
    ['Breakthrough', 4, ScenarioObjectiveType.Breakthrough, 54321],
  ] as const)(
    'generates %s for %i selected player units',
    (selection, unitCount, expectedObjective, seed) => {
      jest.setSystemTime(seed);
      configureForce(unitCount);
      render(<ScenarioConfigStep />);
      fireEvent.change(screen.getByTestId('quick-game-scenario-select'), {
        target: { value: selection },
      });

      const { game, scenario } = generate();

      expect(game.scenarioConfig.scenarioType).toBe(selection);
      expect(scenario.template.objectiveType).toBe(expectedObjective);
      if (expectedObjective === ScenarioObjectiveType.Defend) {
        expect(scenario.template.id).toBe('defensive_hold');
        expect(scenario.template.minPlayerUnits).toBe(2);
        expect(scenario.template.maxPlayerUnits).toBe(8);
        expect(scenario.turnLimit).toBe(15);
      }
    },
  );

  it('generates the visible Annihilation default without a selector change for four units', () => {
    configureForce(4);
    render(<ScenarioConfigStep />);

    const { scenario } = generate();

    expect(scenario.template.objectiveType).toBe(ScenarioObjectiveType.Destroy);
    expect(scenario.turnLimit).toBe(0);
  });

  it.each([
    ['Green', 1.5, 5, 6, 1],
    ['Regular', 1.5, 4, 5, 1],
    ['Veteran', 1.5, 3, 4, 1],
    ['Elite', 0.5, 2, 3, 4],
  ] as const)(
    'uses selected %s pilot skills even at difficulty %s',
    (selection, difficulty, gunnery, piloting, unitCount) => {
      configureForce(unitCount, difficulty);
      render(<ScenarioConfigStep />);
      fireEvent.change(screen.getByTestId('quick-game-ai-tier-select'), {
        target: { value: selection },
      });

      const { game, scenario, opponent } = generate();

      expect(game.scenarioConfig.aiTier).toBe(selection);
      expect(scenario.opFor.units.length).toBeGreaterThan(0);
      for (const unit of scenario.opFor.units) {
        expect(unit.pilot).toMatchObject({ gunnery, piloting });
      }
      expect(opponent.units.length).toBe(scenario.opFor.units.length);
      for (const unit of opponent.units) {
        expect(unit).toMatchObject({ gunnery, piloting });
      }
    },
  );

  it.each([
    [1, 1],
    [4, 1],
    [4, 1.5],
  ] as const)(
    'uses the visible Regular default for %i units at difficulty %s without a selector change',
    (unitCount, difficulty) => {
      configureForce(unitCount, difficulty);
      render(<ScenarioConfigStep />);

      const { scenario, opponent } = generate();

      expect(scenario.opFor.units.length).toBeGreaterThan(0);
      for (const unit of scenario.opFor.units) {
        expect(unit.pilot).toMatchObject({ gunnery: 4, piloting: 5 });
      }
      for (const unit of opponent.units) {
        expect(unit).toMatchObject({ gunnery: 4, piloting: 5 });
      }
    },
  );
});
