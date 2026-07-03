/**
 * HeatEffectLedger (change `attack-phase-intent-composer`, phase 2,
 * task 2.3).
 *
 * Live totals for the composed volley — weapon heat over banked movement
 * heat, net heat after dissipation, expected damage, volley hit
 * probability — plus the ALWAYS-VISIBLE threshold chips (ADR 0002 D10):
 * the Shutdown and Ammo chips are permanent fixtures whose STATE changes
 * (safe / risk / auto), never their presence, so the player always knows
 * where the thresholds sit. Legal-but-hot compositions are NEVER blocked
 * here — heat is a strategic resource (Live Feasibility Gating Never
 * Blocks Heat).
 *
 * All numbers arrive via the pure ledger model (`buildLedgerModel`) —
 * heat SSOT (`src/constants/heat.ts`) + phase-1 totals.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import React from 'react';

import type { ILedgerModel } from './AttackIntentComposer.model';
import type { IThresholdChip } from './composer.types';

export interface HeatEffectLedgerProps {
  readonly model: ILedgerModel;
}

const CHIP_STATE_CLASSES: Record<IThresholdChip['state'], string> = {
  safe: 'border-border-theme bg-surface-raised text-text-theme-secondary',
  risk: 'border-amber-400 bg-amber-950/60 text-amber-200',
  auto: 'border-red-500 bg-red-950/70 text-red-200',
};

/** Non-color-only state glyphs so chip states survive CVD / grayscale. */
const CHIP_STATE_GLYPHS: Record<IThresholdChip['state'], string> = {
  safe: '○',
  risk: '▲',
  auto: '✖',
};

function ThresholdChip({
  chip,
}: {
  readonly chip: IThresholdChip;
}): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${CHIP_STATE_CLASSES[chip.state]}`}
      data-testid={`ledger-chip-${chip.id}`}
      data-chip-state={chip.state}
      role="status"
      aria-label={`${chip.label}: ${chip.detail}`}
      title={chip.detail}
    >
      <span aria-hidden="true">{CHIP_STATE_GLYPHS[chip.state]}</span>
      {chip.label}
      <span className="opacity-80">{chip.detail}</span>
    </span>
  );
}

export function HeatEffectLedger({
  model,
}: HeatEffectLedgerProps): React.ReactElement {
  const { totals, projectedHeat, chips } = model;
  return (
    <div
      className="flex flex-col gap-1"
      data-testid="attack-heat-ledger"
      role="group"
      aria-label="Heat and effect ledger"
    >
      <span className="text-text-theme-secondary text-xs font-semibold uppercase">
        Heat &amp; Effect
      </span>
      <div className="text-text-theme-primary flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
        <span data-testid="ledger-weapon-heat">
          Volley heat <span className="font-semibold">{totals.weaponHeat}</span>
        </span>
        <span data-testid="ledger-total-heat">
          + movement <span className="font-semibold">{totals.totalHeat}</span>
        </span>
        <span data-testid="ledger-net-heat">
          net{' '}
          <span
            className={`font-semibold ${
              totals.netHeat > 0 ? 'text-amber-300' : ''
            }`}
          >
            {totals.netHeat > 0 ? `+${totals.netHeat}` : totals.netHeat}
          </span>
        </span>
        <span data-testid="ledger-projected-heat">
          projected <span className="font-semibold">{projectedHeat}</span>
        </span>
        <span data-testid="ledger-expected-damage">
          exp. dmg{' '}
          <span className="font-semibold">
            {totals.expectedDamage.toFixed(1)}
          </span>
        </span>
        <span data-testid="ledger-volley-probability">
          volley{' '}
          <span className="font-semibold">
            {Math.round(totals.volleyHitProbability)}%
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <ThresholdChip key={chip.id} chip={chip} />
        ))}
      </div>
    </div>
  );
}

export default HeatEffectLedger;
