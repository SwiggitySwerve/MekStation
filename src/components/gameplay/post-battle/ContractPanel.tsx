/**
 * ContractPanel
 *
 * Renders the contract status flip the post-battle processor will apply:
 * Active → Success / Failed depending on outcome end-reason and winner.
 * Hidden entirely when the outcome carries no `contractId` (standalone
 * skirmish).
 *
 * Pure presentational. Caller passes the resolved contract metadata —
 * the panel doesn't reach into stores.
 *
 * @spec openspec/changes/add-post-battle-review-ui § 6 (Contract Status Panel)
 * @module components/gameplay/post-battle/ContractPanel
 */

import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardSection } from '@/components/ui/Card';
import {
  type ICombatOutcome,
  CombatEndReason,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

export interface ContractPanelProps {
  /** Hand-off shape from the engine. */
  readonly outcome: ICombatOutcome;
  /** Side this UI player controls. Defaults to Player. */
  readonly playerSide?: GameSide;
  /** Resolved contract display name; null when not yet loaded. */
  readonly contractName?: string | null;
  /** Resolved employer display name; null when unknown. */
  readonly employerName?: string | null;
  /** Optional payment delta (positive = bonus, negative = penalty) in C-Bills. */
  readonly paymentDelta?: number | null;
}

/**
 * Determine the post-battle contract status the processor will apply.
 * Mirrors `applyContractDelta` in `postBattleProcessor.ts` so the
 * preview matches what actually persists.
 */
function deriveContractStatus(
  outcome: ICombatOutcome,
  playerSide: GameSide,
): 'success' | 'failed' | 'unchanged' {
  const winner = outcome.report.winner;
  const playerWon = winner === playerSide;
  const terminal =
    outcome.endReason === CombatEndReason.ObjectiveMet ||
    outcome.endReason === CombatEndReason.Destruction ||
    outcome.endReason === CombatEndReason.Concede;
  if (!terminal) return 'unchanged';
  return playerWon ? 'success' : 'failed';
}

function statusBadgeProps(status: 'success' | 'failed' | 'unchanged'): {
  variant: 'emerald' | 'red' | 'slate';
  label: string;
} {
  if (status === 'success') return { variant: 'emerald', label: 'COMPLETED' };
  if (status === 'failed') return { variant: 'red', label: 'FAILED' };
  return { variant: 'slate', label: 'IN PROGRESS' };
}

function formatPaymentDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '−';
  return `${sign}${Math.abs(delta).toLocaleString('en-US')} CB`;
}

export function ContractPanel({
  outcome,
  playerSide = GameSide.Player,
  contractName = null,
  employerName = null,
  paymentDelta = null,
}: ContractPanelProps): React.ReactElement | null {
  // Hide entirely when the outcome doesn't link to a contract — keeps
  // the layout from showing a placeholder for standalone skirmishes.
  if (!outcome.contractId) {
    return null;
  }

  const status = deriveContractStatus(outcome, playerSide);
  const { variant, label } = statusBadgeProps(status);

  return (
    <Card data-testid="contract-panel">
      <CardSection title="Contract" titleColor="violet">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-theme-secondary">Contract</span>
            <span
              className="text-text-theme-primary font-medium"
              data-testid="contract-name"
            >
              {contractName ?? outcome.contractId}
            </span>
          </div>
          {employerName ? (
            <div className="flex items-center justify-between">
              <span className="text-text-theme-secondary">Employer</span>
              <span
                className="text-text-theme-primary"
                data-testid="contract-employer"
              >
                {employerName}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-text-theme-secondary">Status</span>
            <Badge variant={variant} size="sm" data-testid="contract-status">
              {label}
            </Badge>
          </div>
          {paymentDelta !== null && paymentDelta !== 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-text-theme-secondary">Payment delta</span>
              <span
                className={
                  paymentDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                }
                data-testid="contract-payment-delta"
              >
                {formatPaymentDelta(paymentDelta)}
              </span>
            </div>
          ) : null}
        </div>
      </CardSection>
    </Card>
  );
}

export default ContractPanel;
