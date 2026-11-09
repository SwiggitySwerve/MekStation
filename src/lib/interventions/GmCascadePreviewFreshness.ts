import type {
  GmCascadePreviewFreshness,
  IGmCascadePreview,
} from '@/types/interventions/GmCascadePreviewTypes';

import { hashState } from '@/utils/events/hashUtils';

export function capturePreviewFreshness(
  state: unknown,
): GmCascadePreviewFreshness {
  const campaignId = readString(state, 'id');
  const updatedAt = readString(state, 'updatedAt');
  const currentDate = readDateIso(state, 'currentDate');
  if (campaignId && updatedAt && currentDate) {
    return Object.freeze({
      kind: 'campaign',
      campaignId,
      updatedAt,
      currentDate,
    });
  }
  return Object.freeze({ kind: 'state', fingerprint: hashState(state) });
}

export function validateGmCascadePreviewFreshness(
  preview: IGmCascadePreview,
  state: unknown,
): string | undefined {
  const legacyFailure = validatePreviewFreshness(preview, state);
  if (legacyFailure) return legacyFailure;

  const { freshness } = preview;
  if (!freshness) {
    return `Cannot approve GM ${preview.domain} cascade preview without pipeline freshness. Generate a new preview.`;
  }
  if (freshness.kind === 'campaign') {
    if (readString(state, 'id') !== freshness.campaignId) {
      return 'Cannot approve GM cascade preview for a different campaign.';
    }
    if (readString(state, 'updatedAt') !== freshness.updatedAt) {
      return 'Cannot approve GM cascade preview from a stale campaign version.';
    }
    if (readDateIso(state, 'currentDate') !== freshness.currentDate) {
      return 'Cannot approve GM cascade preview from a stale campaign date.';
    }
  } else if (hashState(state) !== freshness.fingerprint) {
    return 'Cannot approve GM cascade preview from a stale state fingerprint.';
  }
  return undefined;
}

export function validatePreviewFreshness(
  preview: Pick<IGmCascadePreview, 'domainPayload'>,
  state: unknown,
): string | undefined {
  const correction = readCorrection(preview.domainPayload);
  if (!correction) return undefined;

  const baseUpdatedAt = readString(correction, 'baseUpdatedAt');
  if (baseUpdatedAt) {
    const currentUpdatedAt = readString(state, 'updatedAt');
    if (currentUpdatedAt && currentUpdatedAt !== baseUpdatedAt) {
      return 'Cannot approve GM cascade preview from a stale campaign version.';
    }
  }

  const baseCurrentDate = readString(correction, 'baseCurrentDate');
  if (baseCurrentDate) {
    const currentDate = readDateIso(state, 'currentDate');
    if (currentDate && currentDate !== baseCurrentDate) {
      return 'Cannot approve GM cascade preview from a stale campaign date.';
    }
  }

  return undefined;
}

function readCorrection(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const correction = value.correction;
  return isRecord(correction) ? correction : undefined;
}

function readString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const entry = value[key];
  return typeof entry === 'string' ? entry : undefined;
}

function readDateIso(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const entry = value[key];
  if (entry instanceof Date) return entry.toISOString();
  if (typeof entry !== 'string') return undefined;
  const date = new Date(entry);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
