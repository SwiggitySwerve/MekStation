import React from 'react';

import type {
  GmLedgerRow,
  PlayerLedgerRow,
} from './GmCampaignInterventionControlPlane.helpers';

// Player copy for the internal correction-family tokens. These `family` values
// (`time-advance`, `funds-transaction`, ...) are engine identifiers; players see
// plain-language category names instead of the raw token in the ledger meta line.
const FAMILY_PLAYER_LABEL: Readonly<Record<string, string>> = {
  'time-advance': 'Campaign time',
  'funds-transaction': 'Finances',
  'repair-ticket': 'Repairs',
  'salvage-allocation': 'Salvage',
  'unit-reload': 'Unit readiness',
  'base-unit-state': 'Unit readiness',
  'inventory-lot': 'Inventory',
};

// Resolve a row's correction family to player copy, falling back to a Title-Cased
// version of any unmapped token so no raw kebab-case identifier ever leaks.
function familyToPlayerLabel(family: string | undefined): string {
  if (!family) return 'GM correction';
  const mapped = FAMILY_PLAYER_LABEL[family];
  if (mapped) return mapped;
  return family
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function LedgerProjection({
  rows,
  testId,
  title,
}: {
  readonly rows: readonly PlayerLedgerRow[];
  readonly testId: string;
  readonly title: string;
}): React.ReactElement {
  return (
    <section
      className="border-border-theme rounded-md border p-4"
      data-testid={testId}
    >
      <h2 className="text-text-theme-primary text-base font-semibold">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-text-theme-secondary mt-3 text-sm">
          No player-visible ledger entries yet.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-surface-base rounded-md p-3"
              data-testid={`gm-ledger-player-row-${row.sequence}`}
            >
              <p className="text-text-theme-primary text-sm">
                {row.publicEffect.summary}
              </p>
              <p className="text-text-theme-secondary mt-1 text-xs">
                {familyToPlayerLabel(row.publicEffect.family)} - {row.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function GmLedgerProjection({
  rows,
}: {
  readonly rows: readonly GmLedgerRow[];
}): React.ReactElement {
  return (
    <section
      className="border-border-theme rounded-md border p-4"
      data-testid="gm-ledger-private-log"
    >
      <h2 className="text-text-theme-primary text-base font-semibold">
        GM Ledger
      </h2>
      {rows.length === 0 ? (
        <p className="text-text-theme-secondary mt-3 text-sm">
          No GM-private ledger entries yet.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-surface-base rounded-md p-3"
              data-testid={`gm-ledger-gm-row-${row.sequence}`}
            >
              <p className="text-text-theme-primary text-sm">
                {row.publicEffect.summary}
              </p>
              {row.privateMetadata ? (
                <div className="text-text-theme-secondary mt-2 space-y-1 text-xs">
                  <p>{row.privateMetadata.reason}</p>
                  {row.privateMetadata.defaultOutcome ? (
                    <p>{row.privateMetadata.defaultOutcome}</p>
                  ) : null}
                  {row.privateMetadata.hiddenNotes ? (
                    <p>{row.privateMetadata.hiddenNotes}</p>
                  ) : null}
                  {row.privateMetadata.manualTakeoverNotes ? (
                    <p>{row.privateMetadata.manualTakeoverNotes}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
