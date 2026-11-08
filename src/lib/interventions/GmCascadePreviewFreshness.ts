import type { IGmCascadePreview } from '@/types/interventions/GmCascadePreviewTypes';

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
