/** Release availability policy. Safe to import in browsers and on the server. */
export type MultiplayerMode = 'hosted' | 'coop' | 'p2p';
export type ModeAvailabilityStatus = 'preview' | 'disabled' | 'available';

export interface IModeAvailability {
  readonly status: ModeAvailabilityStatus;
  readonly label: string;
  readonly sentence: string;
}

export const modeAvailability: Readonly<
  Record<MultiplayerMode, IModeAvailability>
> = {
  hosted: {
    status: 'preview',
    label: 'Preview',
    sentence:
      'You cannot yet select enemy targets, and some matches stop before they finish.',
  },
  coop: {
    status: 'preview',
    label: 'Preview',
    sentence: 'Some campaign changes can be lost after saving or reloading.',
  },
  p2p: {
    status: 'disabled',
    label: 'Preview',
    sentence:
      "Match launch is unavailable because the two players' battles do not stay in sync.",
  },
};

export function getModeNotice(mode: MultiplayerMode): IModeAvailability | null {
  const entry = modeAvailability[mode];
  return entry.status === 'available' ? null : entry;
}

export function isModeLaunchDisabled(mode: MultiplayerMode): boolean {
  return modeAvailability[mode].status === 'disabled';
}

export function multiplayerPreviewLabel(): string | null {
  return (
    Object.values(modeAvailability).find(
      (entry) => entry.status !== 'available',
    )?.label ?? null
  );
}
