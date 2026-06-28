import type { IMatchUnitBootstrapEntry } from '@/lib/multiplayer/server/IMatchStore';
import type { TeamLayout } from '@/types/multiplayer/Lobby';

import { buildSlotId, seatLayoutSpec } from '@/types/multiplayer/Lobby';

export type MatchRosterPresetId =
  | 'assault-vs-heavy'
  | 'atlas-mirror'
  | 'marauder-mirror';

export interface IMatchRosterPreset {
  readonly id: MatchRosterPresetId;
  readonly label: string;
  readonly playerUnitRef: string;
  readonly playerUnitName: string;
  readonly opponentUnitRef: string;
  readonly opponentUnitName: string;
}

type BootstrapSide = IMatchUnitBootstrapEntry['side'];

export const DEFAULT_MATCH_ROSTER_PRESET_ID: MatchRosterPresetId =
  'assault-vs-heavy';

export const MATCH_ROSTER_PRESETS: readonly IMatchRosterPreset[] = [
  {
    id: 'assault-vs-heavy',
    label: 'Atlas vs Marauder',
    playerUnitRef: 'atlas-as7-d',
    playerUnitName: 'Atlas AS7-D',
    opponentUnitRef: 'marauder-mad-3r',
    opponentUnitName: 'Marauder MAD-3R',
  },
  {
    id: 'atlas-mirror',
    label: 'Atlas mirror',
    playerUnitRef: 'atlas-as7-d',
    playerUnitName: 'Atlas AS7-D',
    opponentUnitRef: 'atlas-as7-d',
    opponentUnitName: 'Atlas AS7-D',
  },
  {
    id: 'marauder-mirror',
    label: 'Marauder mirror',
    playerUnitRef: 'marauder-mad-3r',
    playerUnitName: 'Marauder MAD-3R',
    opponentUnitRef: 'marauder-mad-3r',
    opponentUnitName: 'Marauder MAD-3R',
  },
];

export interface IMatchRosterUnitOption {
  readonly unitRef: string;
  readonly unitName: string;
}

export const MATCH_ROSTER_UNIT_OPTIONS: readonly IMatchRosterUnitOption[] = [
  { unitRef: 'atlas-as7-d', unitName: 'Atlas AS7-D' },
  { unitRef: 'marauder-mad-3r', unitName: 'Marauder MAD-3R' },
  { unitRef: 'awesome-aws-8q', unitName: 'Awesome AWS-8Q' },
  { unitRef: 'catapult-cplt-c1', unitName: 'Catapult CPLT-C1' },
  { unitRef: 'hunchback-hbk-4g', unitName: 'Hunchback HBK-4G' },
  { unitRef: 'locust-lct-1v', unitName: 'Locust LCT-1V' },
];

export interface IMatchCustomRosterSeatInput {
  readonly slotId: string;
  readonly unitRef: string;
  readonly pilotName: string;
  readonly gunnery: number;
  readonly piloting: number;
}

export interface IMatchCustomRosterSeatRow extends IMatchCustomRosterSeatInput {
  readonly side: BootstrapSide;
  readonly sideLabel: string;
  readonly seatNumber: number;
  readonly sideSeatIndex: number;
  readonly unitName: string;
}

export function matchRosterPresetById(
  id: MatchRosterPresetId,
): IMatchRosterPreset {
  return (
    MATCH_ROSTER_PRESETS.find((preset) => preset.id === id) ??
    MATCH_ROSTER_PRESETS[0]
  );
}

function sideForSeatSide(sideIndex: number): BootstrapSide {
  return sideIndex === 0 ? 'player' : 'opponent';
}

function sideSlug(side: BootstrapSide): string {
  return side === 'player' ? 'player' : 'opponent';
}

function unitRefForSide(
  preset: IMatchRosterPreset,
  side: BootstrapSide,
): string {
  return side === 'player' ? preset.playerUnitRef : preset.opponentUnitRef;
}

function unitNameForSide(
  preset: IMatchRosterPreset,
  side: BootstrapSide,
): string {
  return side === 'player' ? preset.playerUnitName : preset.opponentUnitName;
}

function defaultUnitRefForSide(side: BootstrapSide): string {
  return side === 'player' ? 'atlas-as7-d' : 'marauder-mad-3r';
}

function unitOptionByRef(unitRef: string): IMatchRosterUnitOption {
  return (
    MATCH_ROSTER_UNIT_OPTIONS.find((option) => option.unitRef === unitRef) ??
    MATCH_ROSTER_UNIT_OPTIONS[0]
  );
}

function startHexFor(
  side: BootstrapSide,
  sideSeatIndex: number,
  mapRadius: number,
): { readonly q: number; readonly r: number } {
  const qOffset = Math.max(0, Math.min(2, mapRadius - 1));
  const q = side === 'player' ? -qOffset : qOffset;
  const desiredR = side === 'player' ? sideSeatIndex - 1 : 1 - sideSeatIndex;
  const minR = Math.max(-mapRadius, -q - mapRadius);
  const maxR = Math.min(mapRadius, -q + mapRadius);
  return {
    q,
    r: Math.max(minR, Math.min(maxR, desiredR)),
  };
}

export function buildMatchUnitBootstrapForPreset(
  layout: TeamLayout,
  presetId: MatchRosterPresetId,
  mapRadius: number,
): readonly IMatchUnitBootstrapEntry[] {
  const preset = matchRosterPresetById(presetId);
  const spec = seatLayoutSpec(layout);
  const sideCounts = new Map<BootstrapSide, number>();
  const entries: IMatchUnitBootstrapEntry[] = [];

  spec.sides.forEach((_seatSide, sideIndex) => {
    const side = sideForSeatSide(sideIndex);
    for (let seat = 1; seat <= spec.seatsPerSide; seat += 1) {
      const sideSeatIndex = (sideCounts.get(side) ?? 0) + 1;
      sideCounts.set(side, sideSeatIndex);
      const unitRef = unitRefForSide(preset, side);
      const slug = sideSlug(side);
      entries.push({
        unitId: `${slug}-${sideSeatIndex}-${unitRef}`,
        unitRef,
        side,
        name: `${unitNameForSide(preset, side)} ${sideSeatIndex}`,
        pilotRef: `${slug}-${sideSeatIndex}-pilot`,
        gunnery: 4,
        piloting: 5,
        startHex: startHexFor(side, sideSeatIndex, mapRadius),
      });
    }
  });

  return entries;
}

export function buildCustomRosterSeatRows(
  layout: TeamLayout,
  inputs: Readonly<Record<string, Partial<IMatchCustomRosterSeatInput>>> = {},
): readonly IMatchCustomRosterSeatRow[] {
  const spec = seatLayoutSpec(layout);
  const sideCounts = new Map<BootstrapSide, number>();
  const rows: IMatchCustomRosterSeatRow[] = [];

  spec.sides.forEach((sideLabel, sideIndex) => {
    const side = sideForSeatSide(sideIndex);
    for (let seatNumber = 1; seatNumber <= spec.seatsPerSide; seatNumber += 1) {
      const sideSeatIndex = (sideCounts.get(side) ?? 0) + 1;
      sideCounts.set(side, sideSeatIndex);
      const slotId = buildSlotId(sideLabel, seatNumber);
      const input = inputs[slotId] ?? {};
      const unitRef = input.unitRef ?? defaultUnitRefForSide(side);
      const unitOption = unitOptionByRef(unitRef);
      rows.push({
        slotId,
        side,
        sideLabel,
        seatNumber,
        sideSeatIndex,
        unitRef: unitOption.unitRef,
        unitName: unitOption.unitName,
        pilotName:
          input.pilotName ??
          `${sideLabel} ${seatNumber} ${side === 'player' ? 'Pilot' : 'OPFOR'}`,
        gunnery: input.gunnery ?? 4,
        piloting: input.piloting ?? 5,
      });
    }
  });

  return rows;
}

export function buildMatchUnitBootstrapForCustomRoster(
  layout: TeamLayout,
  inputs: Readonly<Record<string, Partial<IMatchCustomRosterSeatInput>>>,
  mapRadius: number,
): readonly IMatchUnitBootstrapEntry[] {
  return buildCustomRosterSeatRows(layout, inputs).map((row) => ({
    unitId: `${row.slotId}-${row.unitRef}`,
    unitRef: row.unitRef,
    side: row.side,
    name: `${row.unitName} ${row.sideSeatIndex}`,
    pilotRef: row.pilotName.trim() || `${row.slotId}-pilot`,
    gunnery: row.gunnery,
    piloting: row.piloting,
    startHex: startHexFor(row.side, row.sideSeatIndex, mapRadius),
  }));
}
