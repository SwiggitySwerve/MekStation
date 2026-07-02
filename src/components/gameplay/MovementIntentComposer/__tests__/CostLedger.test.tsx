/**
 * CostLedger tests (task 4.3). Proves per-item rows, running total, per-budget
 * affordability columns (affordable / affordable-exhausted / over), the
 * world-change recompute flag, and the row-remove dispatch. Covers the spec
 * scenario "Ledger totals against damaged budgets".
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IBudgetOption, IMovementIntentState } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import { buildCostLedgerRows, CostLedger } from '../CostLedger';

function budget(
  mode: MovementType,
  budgetMp: number,
  affordable: boolean,
): IBudgetOption {
  return {
    mode,
    budgetMp,
    affordable,
    heatGenerated: mode === MovementType.Run ? 2 : 1,
    attackerToHitModifier: mode === MovementType.Run ? 2 : 1,
  };
}

describe('buildCostLedgerRows', () => {
  it('emits a removable row per posture and one summary row for locomotion', () => {
    const intent: IMovementIntentState = {
      items: [
        { kind: 'posture', action: 'CAREFUL_STAND', mpCost: 2 },
        {
          kind: 'locomotion',
          legs: [
            {
              from: { hex: { q: 0, r: 0 }, facingChange: 0 },
              to: { hex: { q: 1, r: 0 }, facingChange: 0 },
              path: [{ q: 1, r: 0 }],
              mpCost: 3,
            },
          ],
          finalFacing: 0,
        },
      ],
      lockedMode: null,
    };
    const rows = buildCostLedgerRows(intent);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      label: 'Careful Stand',
      mpCost: 2,
      removable: true,
    });
    expect(rows[1]).toMatchObject({ mpCost: 3, removable: false });
  });
});

describe('CostLedger', () => {
  it('marks Walk affordable-exhausted (0 left) and Run affordable (1 left) at total 2 MP', () => {
    // Spec scenario: engine-crit unit Walk 2 / Run 3, Careful Stand 2 MP.
    render(
      <CostLedger
        rows={[
          { index: 0, label: 'Careful Stand', mpCost: 2, removable: true },
        ]}
        ledgerTotalMp={2}
        budgetOptions={[
          budget(MovementType.Walk, 2, true),
          budget(MovementType.Run, 3, true),
        ]}
        overEveryBudget={false}
        onRemoveRow={() => {}}
      />,
    );
    expect(screen.getByTestId('movement-cost-ledger-total')).toHaveTextContent(
      '2 MP',
    );
    expect(screen.getByTestId('ledger-budget-walk')).toHaveAttribute(
      'data-budget-affordability',
      'exhausted',
    );
    expect(screen.getByTestId('ledger-budget-run')).toHaveAttribute(
      'data-budget-affordability',
      'affordable',
    );
  });

  it('flags the recompute state and marks a budget over when the total exceeds it', () => {
    render(
      <CostLedger
        rows={[
          { index: 0, label: 'Careful Stand', mpCost: 4, removable: true },
        ]}
        ledgerTotalMp={4}
        budgetOptions={[budget(MovementType.Walk, 2, false)]}
        overEveryBudget
        onRemoveRow={() => {}}
      />,
    );
    expect(
      screen.getByTestId('movement-cost-ledger-recompute-flag'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('ledger-budget-walk')).toHaveAttribute(
      'data-budget-affordability',
      'over',
    );
  });

  it('dispatches onRemoveRow with the row index for removable rows', () => {
    const onRemoveRow = jest.fn();
    render(
      <CostLedger
        rows={[{ index: 1, label: 'Stand Up', mpCost: 2, removable: true }]}
        ledgerTotalMp={2}
        budgetOptions={[budget(MovementType.Walk, 4, true)]}
        overEveryBudget={false}
        onRemoveRow={onRemoveRow}
      />,
    );
    fireEvent.click(screen.getByTestId('ledger-row-remove-1'));
    expect(onRemoveRow).toHaveBeenCalledWith(1);
  });
});
