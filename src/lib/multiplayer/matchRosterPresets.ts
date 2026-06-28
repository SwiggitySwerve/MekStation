import type { IMatchUnitBootstrapEntry } from '@/lib/multiplayer/server/IMatchStore';
import type { TeamLayout } from '@/types/multiplayer/Lobby';

import { seatLayoutSpec } from '@/types/multiplayer/Lobby';

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
