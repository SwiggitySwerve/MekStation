/**
 * Post-Battle Review smoke tests
 *
 * Renders each of the six panels with a synthetic outcome and asserts
 * the basic happy-path / empty-state behavior. Uses the presentational
 * `PostBattleReviewScreen` for the CTA test so we don't have to mock
 * the router or stores.
 *
 * @spec openspec/changes/add-post-battle-review-ui/specs/post-battle-ui/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IRepairTicket } from '@/types/campaign/RepairTicket';

import {
  CasualtyPanel,
  ContractPanel,
  PilotXpPanel,
  PostBattleHeader,
  RepairPreviewPanel,
  SalvagePanel,
} from '@/components/gameplay/post-battle';
import { PostBattleReviewScreen } from '@/pages/gameplay/games/[id]/review';
import { DamageLevel, type ISalvageReport } from '@/types/campaign/Salvage';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  type ICombatOutcome,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Fixtures
// =============================================================================

function makeOutcome(overrides: Partial<ICombatOutcome> = {}): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: 'match-001',
    contractId: 'contract-1',
    scenarioId: 'scenario-1',
    endReason: CombatEndReason.ObjectiveMet,
    capturedAt: '2026-04-17T00:00:00.000Z',
    report: {
      version: 1,
      matchId: 'match-001',
      winner: GameSide.Player,
      reason: 'objective',
      turnCount: 7,
      units: [
        {
          unitId: 'unit-player-1',
          side: GameSide.Player,
          designation: 'Atlas AS7-D',
          damageDealt: 84,
          damageReceived: 22,
          kills: 1,
          heatProblems: 0,
          physicalAttacks: 0,
          xpPending: true,
        },
      ],
      mvpUnitId: 'unit-player-1',
      log: [],
    },
    unitDeltas: [
      {
        unitId: 'unit-player-1',
        side: GameSide.Player,
        destroyed: false,
        finalStatus: UnitFinalStatus.Damaged,
        armorRemaining: { CT: 30, LT: 12 },
        internalsRemaining: { CT: 22, LT: 18 },
        destroyedLocations: [],
        destroyedComponents: ['Medium Laser'],
        heatEnd: 6,
        ammoRemaining: { 'ac20-bin-1': 4 },
        pilotState: {
          conscious: true,
          wounds: 1,
          killed: false,
          finalStatus: PilotFinalStatus.Wounded,
        },
      },
    ],
    ...overrides,
  };
}

function makeSalvageReport(empty = false): ISalvageReport {
  if (empty) {
    return {
      matchId: 'match-001',
      contractId: 'contract-1',
      candidates: [],
      totalValueEmployer: 0,
      totalValueMercenary: 0,
      hostileTerritoryPenalty: 1,
      auctionRequired: false,
    };
  }
  return {
    matchId: 'match-001',
    contractId: 'contract-1',
    candidates: [
      {
        source: 'unit',
        unitId: 'enemy-1',
        designation: 'Locust LCT-1V',
        destroyedFromBattle: 'match-001',
        finalStatus: 'destroyed',
        damageLevel: DamageLevel.Heavy,
        originalValue: 800_000,
        recoveredValue: 200_000,
        recoveryPercentage: 0.25,
        repairCostEstimate: 50_000,
        disposition: 'mercenary',
        status: 'awarded',
      },
    ],
    totalValueEmployer: 0,
    totalValueMercenary: 200_000,
    hostileTerritoryPenalty: 1,
    auctionRequired: false,
  };
}

function makeRepairTicket(
  overrides: Partial<IRepairTicket> = {},
): IRepairTicket {
  return {
    ticketId: 'ticket-1',
    unitId: 'unit-player-1',
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 10,
    expectedHours: 4,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-001',
    createdAt: '2026-04-17T00:00:00.000Z',
    status: 'queued',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Post-battle review panels', () => {
  it('PostBattleHeader renders the player-perspective outcome', () => {
    render(
      <PostBattleHeader outcome={makeOutcome()} contractName="Test Contract" />,
    );
    expect(screen.getByTestId('post-battle-outcome')).toHaveTextContent(
      'VICTORY',
    );
    expect(screen.getByTestId('post-battle-end-reason')).toHaveTextContent(
      'Objective Met',
    );
    expect(screen.getByTestId('post-battle-contract-name')).toHaveTextContent(
      'Test Contract',
    );
  });

  it('CasualtyPanel renders one row per damaged player unit', () => {
    render(<CasualtyPanel outcome={makeOutcome()} />);
    expect(
      screen.getByTestId('casualty-row-unit-player-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('casualty-status-unit-player-1'),
    ).toHaveTextContent('DAMAGED');
    expect(
      screen.getByTestId('casualty-components-unit-player-1'),
    ).toHaveTextContent('Medium Laser');
  });

  it('CasualtyPanel shows empty state when no units took damage', () => {
    const outcome = makeOutcome({
      unitDeltas: [
        {
          unitId: 'unit-player-1',
          side: GameSide.Player,
          destroyed: false,
          finalStatus: UnitFinalStatus.Intact,
          armorRemaining: {},
          internalsRemaining: {},
          destroyedLocations: [],
          destroyedComponents: [],
          heatEnd: 0,
          ammoRemaining: {},
          pilotState: {
            conscious: true,
            wounds: 0,
            killed: false,
            finalStatus: PilotFinalStatus.Active,
          },
        },
      ],
    });
    render(<CasualtyPanel outcome={outcome} />);
    expect(screen.getByTestId('casualty-empty')).toBeInTheDocument();
  });

  it('PilotXpPanel renders pilot status and an XP estimate', () => {
    render(
      <PilotXpPanel
        outcome={makeOutcome()}
        pilotNames={{ 'unit-player-1': 'Major Test' }}
      />,
    );
    expect(screen.getByTestId('pilot-row-unit-player-1')).toHaveTextContent(
      'Major Test',
    );
    expect(screen.getByTestId('pilot-status-unit-player-1')).toHaveTextContent(
      'WOUNDED',
    );
    // 1 scenario + 1 kill (player won) = 2.
    expect(screen.getByTestId('pilot-row-unit-player-1')).toHaveTextContent(
      '+2',
    );
  });

  it('SalvagePanel shows totals and candidates when populated', () => {
    render(<SalvagePanel report={makeSalvageReport()} />);
    expect(screen.getByTestId('salvage-totals')).toBeInTheDocument();
    expect(screen.getByTestId('salvage-total-mercenary')).toHaveTextContent(
      '200,000 CB',
    );
    expect(screen.getByTestId('salvage-candidate-enemy-1')).toHaveTextContent(
      'Locust LCT-1V',
    );
  });

  it('SalvagePanel shows empty state when report has no candidates', () => {
    render(<SalvagePanel report={makeSalvageReport(true)} />);
    expect(screen.getByTestId('salvage-empty')).toBeInTheDocument();
  });

  it('SalvagePanel shows empty state when report is null', () => {
    render(<SalvagePanel report={null} />);
    expect(screen.getByTestId('salvage-empty')).toBeInTheDocument();
  });

  it('ContractPanel hides entirely when outcome has no contractId', () => {
    const { container } = render(
      <ContractPanel outcome={makeOutcome({ contractId: null })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('ContractPanel shows COMPLETED status for player-won objective', () => {
    render(
      <ContractPanel
        outcome={makeOutcome()}
        contractName="Wolf Hunt"
        employerName="Federated Suns"
      />,
    );
    expect(screen.getByTestId('contract-name')).toHaveTextContent('Wolf Hunt');
    expect(screen.getByTestId('contract-status')).toHaveTextContent(
      'COMPLETED',
    );
  });

  it('RepairPreviewPanel shows total hours and group rows', () => {
    const tickets = [
      makeRepairTicket({ ticketId: 't1', kind: 'armor', expectedHours: 4 }),
      makeRepairTicket({ ticketId: 't2', kind: 'armor', expectedHours: 3 }),
      makeRepairTicket({ ticketId: 't3', kind: 'component', expectedHours: 8 }),
    ];
    render(<RepairPreviewPanel tickets={tickets} />);
    expect(screen.getByTestId('repair-ticket-count')).toHaveTextContent('3');
    expect(screen.getByTestId('repair-total-hours')).toHaveTextContent('15');
    expect(screen.getByTestId('repair-group-armor')).toBeInTheDocument();
    expect(screen.getByTestId('repair-group-component')).toBeInTheDocument();
  });

  it('RepairPreviewPanel shows empty state when no tickets queued', () => {
    render(<RepairPreviewPanel tickets={[]} />);
    expect(screen.getByTestId('repair-empty')).toBeInTheDocument();
  });

  it('PostBattleReviewScreen fires onApply when CTA is clicked', () => {
    const onApply = jest.fn();
    render(
      <PostBattleReviewScreen
        outcome={makeOutcome()}
        salvageReport={makeSalvageReport()}
        repairTickets={[makeRepairTicket()]}
        contractName="Wolf Hunt"
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByTestId('apply-outcome-cta'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
