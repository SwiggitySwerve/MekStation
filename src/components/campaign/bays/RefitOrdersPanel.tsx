import React, { useState } from 'react';

import type { IRefitOrder } from '@/types/campaign/Refit';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  getConflictingRefitUnitIds,
  getOpenRefitOrders,
} from '@/lib/campaign/refit/refitPipeline';

interface RefitOrdersPanelProps {
  readonly orders: readonly IRefitOrder[];
  readonly readOnly?: boolean;
  /** Resolves successfully only after the campaign save is acknowledged. */
  readonly onCancel: (
    orderId: string,
  ) => Promise<{ readonly applied: boolean; readonly reason?: string }>;
}

type CancellationState =
  | { readonly status: 'idle' | 'saved' }
  | { readonly status: 'saving'; readonly orderId: string }
  | {
      readonly status: 'error';
      readonly orderId: string;
      readonly message: string;
    };

/** Display refit history without owning campaign mutations or rules. */
export function RefitOrdersPanel({
  orders,
  readOnly = false,
  onCancel,
}: RefitOrdersPanelProps): React.ReactElement {
  const [operation, setOperation] = useState<CancellationState>({
    status: 'idle',
  });
  const openOrders = getOpenRefitOrders(orders);
  const conflicts = getConflictingRefitUnitIds(orders);
  const busy = operation.status === 'saving';

  const cancel = async (orderId: string) => {
    if (readOnly || busy) return;
    setOperation({ status: 'saving', orderId });
    try {
      const result = await onCancel(orderId);
      setOperation(
        result.applied
          ? { status: 'saved' }
          : {
              status: 'error',
              orderId,
              message: result.reason ?? 'Refit cancellation was not saved.',
            },
      );
    } catch (error) {
      setOperation({
        status: 'error',
        orderId,
        message:
          error instanceof Error
            ? error.message
            : 'Refit cancellation was not saved.',
      });
    }
  };

  return (
    <section aria-label="Refit Orders" className="min-w-0 space-y-3">
      <h2 className="text-text-theme-primary text-lg font-semibold">
        Refit Orders
      </h2>
      {readOnly && (
        <p className="text-text-theme-secondary text-sm">
          Only the host can cancel refit orders.
        </p>
      )}
      {operation.status === 'saved' && (
        <p role="status" className="text-text-theme-secondary text-sm">
          Refit cancellation saved.
        </p>
      )}
      {operation.status === 'error' && (
        <div className="border-border-theme bg-surface-raised min-w-0 space-y-2 rounded-lg border p-3">
          <p
            role="alert"
            className="text-text-theme-primary text-sm break-words"
          >
            {operation.message}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={readOnly}
            onClick={() => void cancel(operation.orderId)}
          >
            Retry Save
          </Button>
        </div>
      )}
      {openOrders.length === 0 && (
        <p className="text-text-theme-secondary text-sm">
          No open refit orders.
        </p>
      )}
      {openOrders.map((order) => (
        <Card
          key={order.id}
          className="min-w-0 p-3"
          data-testid={`refit-order-${order.id}`}
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-text-theme-primary text-sm font-semibold break-all">
                {order.unitId}
              </h3>
              <p className="text-text-theme-secondary font-mono text-xs break-all">
                {order.id}
              </p>
              <p className="text-text-theme-secondary mt-1 text-sm">
                {order.status === 'proposed' ? 'Proposed' : 'In Progress'} ·{' '}
                {order.hoursCompleted}/{order.estimatedHours}h
              </p>
              {conflicts.has(order.unitId) && (
                <p className="text-text-theme-primary mt-1 text-sm">
                  Multiple open refits pause this unit until only one remains.
                </p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={readOnly || busy || operation.status === 'error'}
              onClick={() => void cancel(order.id)}
            >
              Cancel Refit
            </Button>
          </div>
        </Card>
      ))}
    </section>
  );
}
