/**
 * QuickGameSetupScenarioConfig — selectors test
 *
 * Per `polish-wave-6.2-gaps` (gaps #4 + #6): the Scenario Type and AI Tier
 * Selects update `useQuickGameStore.scenarioConfig` and the launched session
 * picks the values up. This is the bound-to-store half of tasks 1.3 — the
 * "session picks them up" half is covered by the store contract (Partial<…>
 * merge preserves the new fields, asserted indirectly via store tests).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { GameStatus, GamePhase } from '@/types/gameplay';
import { QuickGameStep } from '@/types/quickgame/QuickGameInterfaces';

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
