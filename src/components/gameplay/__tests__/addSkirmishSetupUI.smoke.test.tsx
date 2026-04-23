/**
 * Per-change smoke test for `add-skirmish-setup-ui`.
 *
 * Covers the acceptance scenarios in tasks.md § 10:
 *   10.1 Launching with a missing pilot blocks submission.
 *   10.2 Radius change recalculates hex count in preview.
 *   10.3 Same pilot assigned to two units moves rather than duplicates.
 *   10.4 Full happy-path wires a valid config through the builder
 *        (checked at the unit level in preBattleSessionBuilder.test.ts;
 *        here we exercise the UI surface that produces the config).
 *
 * @spec openspec/changes/add-skirmish-setup-ui/tasks.md § 10
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IPilot } from '@/types/pilot';
import type { ISkirmishUnitSelection } from '@/utils/gameplay/preBattleSessionBuilder';

import { DeploymentZonePreview } from '@/components/gameplay/DeploymentZonePreview';
import { PilotPicker } from '@/components/gameplay/PilotPicker';
import { TerrainPreset } from '@/types/encounter';
import { getSkirmishConfigError } from '@/utils/gameplay/preBattleSessionBuilder';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const makePilot = (overrides: Partial<IPilot> = {}): IPilot =>
  ({
    id: 'pilot-1',
    name: 'Ghost',
    callsign: 'Ghost',
    skills: { gunnery: 4, piloting: 5 },
    abilities: [],
    experience: 0,
    bv: 0,
    ...overrides,
  }) as IPilot;

const makeUnit = (
  overrides: Partial<ISkirmishUnitSelection> = {},
): ISkirmishUnitSelection => ({
  unitId: 'wsp-1a',
  designation: 'Wasp WSP-1A',
  tonnage: 20,
  bv: 640,
  pilot: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Task 10.1 — launching with missing pilot blocks submission.
// The launcher is validation-gated via `getSkirmishConfigError`. We
// assert that function behaviour end-to-end — the SkirmishLauncher
// reads its output verbatim for the inline error + tooltip.
// ---------------------------------------------------------------------------

describe('task 10.1 — missing pilot blocks launch', () => {
  it('returns a pilot-required error when any unit has no pilot', () => {
    const error = getSkirmishConfigError({
      encounterId: 'enc-1',
      mapRadius: 8,
      terrainPreset: TerrainPreset.Clear,
      player: {
        units: [
          makeUnit({
            pilot: { pilotId: 'p1', callsign: 'A', gunnery: 4, piloting: 5 },
          }),
          makeUnit({
            unitId: 'phx-1',
            designation: 'Phoenix Hawk PXH-1',
            pilot: null,
          }),
        ],
      },
      opponent: {
        units: [
          makeUnit({
            unitId: 'cda-2a',
            designation: 'Cicada CDA-2A',
            pilot: { pilotId: 'p3', callsign: 'C', gunnery: 4, piloting: 5 },
          }),
          makeUnit({
            unitId: 'jvn-10n',
            designation: 'Javelin JVN-10N',
            pilot: { pilotId: 'p4', callsign: 'D', gunnery: 4, piloting: 5 },
          }),
        ],
      },
    });
    expect(error).toBe('Pilot required for unit Phoenix Hawk PXH-1');
  });
});

// ---------------------------------------------------------------------------
// Task 10.2 — radius change recalculates hex count in preview.
// DeploymentZonePreview displays `r={radius} · N hexes`. We re-render
// with two different radii and assert the count changes per the
// hex-count formula `1 + 3*r*(r+1)`.
// ---------------------------------------------------------------------------

describe('task 10.2 — radius change recalculates hex count', () => {
  it('renders 217 hexes for radius 8 and 469 for radius 12', () => {
    const { rerender } = render(
      <DeploymentZonePreview radius={8} preset={TerrainPreset.Clear} />,
    );
    expect(screen.getByText(/r=8/)).toHaveTextContent('217 hexes');

    rerender(
      <DeploymentZonePreview radius={12} preset={TerrainPreset.Clear} />,
    );
    expect(screen.getByText(/r=12/)).toHaveTextContent('469 hexes');
  });
});

// ---------------------------------------------------------------------------
// Task 10.3 — assigning a pilot already on another unit MOVES them.
// The mover lives on the page (`assignPilotMoving`); here we exercise
// the PilotPicker's affordance that exposes the "(move)" suffix when a
// pilot is already in `assignedPilotIds`. This gives us confidence the
// visual signal the user sees matches the caller-side invariant.
// ---------------------------------------------------------------------------

describe('task 10.3 — pilot-move affordance is visible', () => {
  it('flags a pilot already assigned to another unit with the (move) suffix', () => {
    const pilot = makePilot({ id: 'pilot-elite', callsign: 'Elite' });
    const units: ISkirmishUnitSelection[] = [
      makeUnit({
        unitId: 'wsp-1a',
        designation: 'Wasp WSP-1A',
        pilot: null,
      }),
    ];
    const assigned = new Set<string>(['pilot-elite']);
    const onAssign = jest.fn();
    render(
      <PilotPicker
        side="player"
        title="Player Pilots"
        pilots={[pilot]}
        units={units}
        assignedPilotIds={assigned}
        onAssignPilot={onAssign}
      />,
    );
    const select = screen.getByTestId('player-pilot-select-wsp-1a');
    // The (move) suffix appears on any pilot already elsewhere.
    expect(select).toHaveTextContent('(move)');
  });

  it('calls onAssignPilot when a pilot is selected so the caller can perform the move', () => {
    const pilot = makePilot({ id: 'pilot-new', callsign: 'New' });
    const units: ISkirmishUnitSelection[] = [
      makeUnit({
        unitId: 'wsp-1a',
        designation: 'Wasp WSP-1A',
        pilot: null,
      }),
    ];
    const onAssign = jest.fn();
    render(
      <PilotPicker
        side="player"
        title="Player Pilots"
        pilots={[pilot]}
        units={units}
        assignedPilotIds={new Set()}
        onAssignPilot={onAssign}
      />,
    );
    const select = screen.getByTestId('player-pilot-select-wsp-1a');
    fireEvent.change(select, { target: { value: 'pilot-new' } });
    expect(onAssign).toHaveBeenCalledWith('wsp-1a', pilot);
  });
});

// ---------------------------------------------------------------------------
// Task 10.4 — happy-path config produces a valid, launchable shape.
// We build the exact shape the SkirmishLauncher emits on click and
// assert `getSkirmishConfigError` returns null. The downstream
// builder is tested in preBattleSessionBuilder.test.ts.
// ---------------------------------------------------------------------------

describe('task 10.4 — full happy-path produces a launchable config', () => {
  it('returns null validation error for a complete 2v2 config', () => {
    const error = getSkirmishConfigError({
      encounterId: 'enc-1',
      mapRadius: 8,
      terrainPreset: TerrainPreset.Clear,
      player: {
        units: [
          makeUnit({
            pilot: { pilotId: 'p1', callsign: 'A', gunnery: 4, piloting: 5 },
          }),
          makeUnit({
            unitId: 'phx-1',
            designation: 'Phoenix Hawk PXH-1',
            pilot: { pilotId: 'p2', callsign: 'B', gunnery: 4, piloting: 5 },
          }),
        ],
      },
      opponent: {
        units: [
          makeUnit({
            unitId: 'cda-2a',
            designation: 'Cicada CDA-2A',
            pilot: { pilotId: 'p3', callsign: 'C', gunnery: 4, piloting: 5 },
          }),
          makeUnit({
            unitId: 'jvn-10n',
            designation: 'Javelin JVN-10N',
            pilot: { pilotId: 'p4', callsign: 'D', gunnery: 4, piloting: 5 },
          }),
        ],
      },
    });
    expect(error).toBeNull();
  });
});
