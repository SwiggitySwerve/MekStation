import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IInjury } from '@/types/campaign/Person';
import type { IGmTimeCascadeExternalEffectProjection } from '@/types/interventions';

import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';

interface IRosterRecoverySnapshot {
  readonly type: 'gm.roster.recovery';
  readonly pilotId: string;
  readonly pilotName: string;
  readonly status: CampaignPilotStatus;
  readonly recoveryTime: number;
  readonly injuries: readonly IRosterRecoveryInjurySnapshot[];
}

interface IRosterRecoveryInjurySnapshot {
  readonly id: string;
  readonly type: string;
  readonly location: string;
  readonly severity: number;
  readonly daysToHeal: number;
  readonly permanent: boolean;
  readonly acquired: string;
  readonly description?: string;
  readonly skillModifier?: number;
  readonly attributeModifier?: number;
}

interface IRosterRecoveryPatch {
  readonly status: CampaignPilotStatus;
  readonly recoveryTime: number;
  readonly injuries: readonly IInjury[];
}

interface IRosterRecoveryAfterSnapshot extends IRosterRecoverySnapshot {
  readonly patch: IRosterRecoveryPatch;
}

export function projectRosterRecoveryExternalEffects({
  campaignId,
  days,
  rosterEntries,
}: {
  readonly campaignId: string;
  readonly days: number;
  readonly rosterEntries: readonly ICampaignRosterEntry[];
}): readonly IGmTimeCascadeExternalEffectProjection[] {
  if (!Number.isInteger(days) || days <= 0) return [];

  return rosterEntries
    .map((entry) => projectRosterEntryRecovery(campaignId, days, entry))
    .filter(
      (effect): effect is IGmTimeCascadeExternalEffectProjection =>
        effect !== null,
    );
}

export function buildRosterRecoveryPatchesFromExternalEffects(
  effects: readonly IGmTimeCascadeExternalEffectProjection[],
): Map<string, Partial<ICampaignRosterEntry>> {
  const patches = new Map<string, Partial<ICampaignRosterEntry>>();

  for (const effect of effects) {
    if (!effect.ref.includes(':roster:') || !effect.ref.endsWith(':recovery')) {
      continue;
    }

    const after = readRosterRecoveryAfter(effect.after);
    if (!after) continue;

    patches.set(after.pilotId, after.patch);
  }

  return patches;
}

function projectRosterEntryRecovery(
  campaignId: string,
  days: number,
  entry: ICampaignRosterEntry,
): IGmTimeCascadeExternalEffectProjection | null {
  const injuries = entry.injuries ?? [];
  const recoveryTime = Math.max(0, entry.recoveryTime ?? 0);
  const isRecovering =
    entry.status === CampaignPilotStatus.Wounded ||
    recoveryTime > 0 ||
    injuries.some((injury) => !injury.permanent && injury.daysToHeal > 0);

  if (!isRecovering) return null;

  const projectedInjuries = injuries
    .map((injury) =>
      injury.permanent
        ? injury
        : {
            ...injury,
            daysToHeal: Math.max(0, injury.daysToHeal - days),
          },
    )
    .filter((injury) => injury.permanent || injury.daysToHeal > 0);
  const projectedRecoveryTime = Math.max(0, recoveryTime - days);
  const hasHealableInjuries = projectedInjuries.some(
    (injury) => !injury.permanent,
  );
  const projectedStatus =
    entry.status === CampaignPilotStatus.Wounded &&
    projectedRecoveryTime === 0 &&
    !hasHealableInjuries
      ? CampaignPilotStatus.Active
      : entry.status;

  if (
    projectedStatus === entry.status &&
    projectedRecoveryTime === recoveryTime &&
    injurySnapshotsEqual(injuries, projectedInjuries)
  ) {
    return null;
  }

  const before: IRosterRecoverySnapshot = snapshotRosterRecovery(
    entry,
    injuries,
    recoveryTime,
    entry.status,
  );
  const after: IRosterRecoveryAfterSnapshot = {
    ...snapshotRosterRecovery(
      entry,
      projectedInjuries,
      projectedRecoveryTime,
      projectedStatus,
    ),
    patch: {
      status: projectedStatus,
      recoveryTime: projectedRecoveryTime,
      injuries: projectedInjuries,
    },
  };
  const summary = buildRecoverySummary({
    pilotName: entry.pilotName,
    days,
    beforeRecoveryTime: recoveryTime,
    afterRecoveryTime: projectedRecoveryTime,
    beforeStatus: entry.status,
    afterStatus: projectedStatus,
    healedInjuryCount: injuries.length - projectedInjuries.length,
  });

  return {
    ref: `campaign:${campaignId}:roster:${entry.pilotId}:recovery`,
    summary,
    before,
    after,
  };
}

function snapshotRosterRecovery(
  entry: ICampaignRosterEntry,
  injuries: readonly IInjury[],
  recoveryTime: number,
  status: CampaignPilotStatus,
): IRosterRecoverySnapshot {
  return {
    type: 'gm.roster.recovery',
    pilotId: entry.pilotId,
    pilotName: entry.pilotName,
    status,
    recoveryTime,
    injuries: injuries.map(snapshotInjury),
  };
}

function snapshotInjury(injury: IInjury): IRosterRecoveryInjurySnapshot {
  return {
    id: injury.id,
    type: injury.type,
    location: injury.location,
    severity: injury.severity,
    daysToHeal: injury.daysToHeal,
    permanent: injury.permanent,
    acquired: injury.acquired.toISOString(),
    description: injury.description,
    skillModifier: injury.skillModifier,
    attributeModifier: injury.attributeModifier,
  };
}

function buildRecoverySummary({
  pilotName,
  days,
  beforeRecoveryTime,
  afterRecoveryTime,
  beforeStatus,
  afterStatus,
  healedInjuryCount,
}: {
  readonly pilotName: string;
  readonly days: number;
  readonly beforeRecoveryTime: number;
  readonly afterRecoveryTime: number;
  readonly beforeStatus: CampaignPilotStatus;
  readonly afterStatus: CampaignPilotStatus;
  readonly healedInjuryCount: number;
}): string {
  const healedSummary =
    healedInjuryCount > 0
      ? ` ${healedInjuryCount} injur${healedInjuryCount === 1 ? 'y' : 'ies'} healed.`
      : '';
  const statusSummary =
    beforeStatus !== afterStatus
      ? ` Status: ${beforeStatus} -> ${afterStatus}.`
      : '';
  return `${pilotName} recovery advanced ${days} day${days === 1 ? '' : 's'}: ${beforeRecoveryTime} -> ${afterRecoveryTime} days remaining.${healedSummary}${statusSummary}`;
}

function readRosterRecoveryAfter(
  value: unknown,
): IRosterRecoveryAfterSnapshot | null {
  if (!isRecord(value) || value.type !== 'gm.roster.recovery') return null;
  if (!isNonEmptyString(value.pilotId)) return null;
  if (!isNonEmptyString(value.pilotName)) return null;
  if (!isCampaignPilotStatus(value.status)) return null;
  if (!isNonNegativeInteger(value.recoveryTime)) return null;
  if (!Array.isArray(value.injuries)) return null;
  if (!isRecord(value.patch)) return null;

  const patch = readRosterRecoveryPatch(value.patch);
  if (!patch) return null;

  return {
    type: 'gm.roster.recovery',
    pilotId: value.pilotId,
    pilotName: value.pilotName,
    status: value.status,
    recoveryTime: value.recoveryTime,
    injuries: value.injuries.map(snapshotUnknownInjury).filter(isDefined),
    patch,
  };
}

function readRosterRecoveryPatch(
  value: Record<string, unknown>,
): IRosterRecoveryPatch | null {
  if (!isCampaignPilotStatus(value.status)) return null;
  if (!isNonNegativeInteger(value.recoveryTime)) return null;
  if (!Array.isArray(value.injuries)) return null;

  const injuries = value.injuries.map(readInjury).filter(isDefined);
  if (injuries.length !== value.injuries.length) return null;

  return {
    status: value.status,
    recoveryTime: value.recoveryTime,
    injuries,
  };
}

function readInjury(value: unknown): IInjury | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (!isNonEmptyString(value.type)) return null;
  if (!isNonEmptyString(value.location)) return null;
  const severity = readFiniteNumber(value.severity);
  if (severity === null) return null;
  if (!isNonNegativeInteger(value.daysToHeal)) return null;
  if (typeof value.permanent !== 'boolean') return null;
  const skillModifier = readFiniteNumber(value.skillModifier);
  const attributeModifier = readFiniteNumber(value.attributeModifier);

  const acquired = readDate(value.acquired);
  if (!acquired) return null;

  return {
    id: value.id,
    type: value.type,
    location: value.location,
    severity,
    daysToHeal: value.daysToHeal,
    permanent: value.permanent,
    acquired,
    description: isNonEmptyString(value.description)
      ? value.description
      : undefined,
    skillModifier: skillModifier ?? undefined,
    attributeModifier: attributeModifier ?? undefined,
  };
}

function snapshotUnknownInjury(
  value: unknown,
): IRosterRecoveryInjurySnapshot | null {
  const injury = readInjury(value);
  return injury ? snapshotInjury(injury) : null;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function injurySnapshotsEqual(
  before: readonly IInjury[],
  after: readonly IInjury[],
): boolean {
  return (
    JSON.stringify(before.map(snapshotInjury)) ===
    JSON.stringify(after.map(snapshotInjury))
  );
}

function isCampaignPilotStatus(value: unknown): value is CampaignPilotStatus {
  return Object.values(CampaignPilotStatus).includes(
    value as CampaignPilotStatus,
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}
