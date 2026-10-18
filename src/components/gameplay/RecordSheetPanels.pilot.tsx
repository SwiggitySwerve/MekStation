import React, { useEffect, useRef, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

// =============================================================================
// Pilot Status
// =============================================================================

export interface PilotStatusProps {
  name: string;
  gunnery: number;
  piloting: number;
  wounds: number;
  conscious: boolean;
  /**
   * Per `add-damage-feedback-ui` task 1.1 + 5.1 + 5.2: monotonic
   * counter of `PilotHit` events consumed by the parent
   * `RecordSheetDisplay`. Each increment re-triggers the yellow
   * consciousness-roll pulse on the wound track for 500ms so the
   * player sees the roll happen even if it passes. The parent owns
   * the source-of-truth `conscious` flag (reactive to `IUnitGameState`
   * per spec scenario "passed roll leaves no badge") so this counter
   * only drives the transient pulse animation — never the persistent
   * unconscious banner.
   */
  pilotHitCount?: number;
}

export function PilotStatus({
  name,
  gunnery,
  piloting,
  wounds,
  conscious,
  pilotHitCount = 0,
}: PilotStatusProps): React.ReactElement {
  // Per task 5.2: pulse the wound track yellow for 500ms whenever a
  // new PilotHit lands. We dedupe against the previous count so
  // re-renders with the same count don't retrigger the pulse.
  const lastSeenCount = useRef(pilotHitCount);
  const [isPulsing, setIsPulsing] = useState(false);
  useEffect(() => {
    if (pilotHitCount > lastSeenCount.current) {
      lastSeenCount.current = pilotHitCount;
      setIsPulsing(true);
      const t = setTimeout(() => setIsPulsing(false), 500);
      return () => clearTimeout(t);
    }
    lastSeenCount.current = pilotHitCount;
  }, [pilotHitCount]);

  const woundIndicators = [];
  for (let i = 0; i < 6; i++) {
    woundIndicators.push(
      <span
        key={i}
        className={`h-4 w-4 rounded-full border ${
          i < wounds
            ? 'border-red-600 bg-red-500'
            : 'bg-surface-raised border-border-theme'
        }`}
        data-testid={`pilot-wound-${i}`}
        data-filled={i < wounds}
      />,
    );
  }

  return (
    <div className="bg-surface-raised rounded p-2" data-testid="pilot-status">
      {/*
        Per `add-interactive-combat-core-ui` § 9.3: an unconscious
        pilot gets a full-width red banner at the top of the pilot
        panel so the player sees the state immediately even when
        the small inline "UNCONSCIOUS" label is clipped. The
        original inline label is preserved for tests and accessibility.
      */}
      {!conscious && (
        <div
          className="mb-2 flex items-center gap-2 rounded border border-red-700 bg-red-600 px-2 py-1 text-xs font-bold tracking-wide text-white uppercase"
          data-testid="pilot-unconscious-banner"
          role="alert"
        >
          <AppIcon name="warning" size="inline" aria-hidden="true" />
          <span>Pilot unconscious — cannot act this turn</span>
        </div>
      )}
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-text-theme-primary font-medium"
          data-testid="pilot-name"
        >
          {name}
        </span>
        {!conscious && (
          <span
            className="text-xs font-bold text-red-600"
            data-testid="pilot-unconscious"
          >
            UNCONSCIOUS
          </span>
        )}
      </div>
      <div className="text-text-theme-primary flex items-center gap-4 text-sm">
        <span data-testid="pilot-gunnery">
          Gunnery: <strong>{gunnery}</strong>
        </span>
        <span data-testid="pilot-piloting">
          Piloting: <strong>{piloting}</strong>
        </span>
      </div>
      {/*
        Per `add-damage-feedback-ui` task 5.2: the wound track frame
        pulses yellow for 500ms on a new PilotHit, then fades. The
        ring is a pure overlay on top of the wound pips — it does
        not affect the pips themselves so the per-pip tests keep
        working.
      */}
      <div
        className={`relative mt-2 flex items-center gap-1 rounded transition-shadow duration-500 ${
          isPulsing
            ? 'bg-yellow-100 shadow-[0_0_0_2px_rgba(250,204,21,0.7)]'
            : ''
        }`}
        data-testid="pilot-wounds"
        data-pulsing={isPulsing || undefined}
      >
        <span className="text-text-theme-secondary mr-2 text-xs">Wounds:</span>
        {woundIndicators}
      </div>
    </div>
  );
}
