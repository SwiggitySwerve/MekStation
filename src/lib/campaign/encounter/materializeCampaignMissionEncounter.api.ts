import type { IEncounterValidationResult } from '@/types/encounter';

export type FetchImpl = typeof fetch;

export interface ApiFailurePayload {
  readonly error?: string;
  readonly message?: string;
  readonly success?: boolean;
}

interface EncounterValidationApiResponse extends ApiFailurePayload {
  readonly validation?: IEncounterValidationResult;
}

export function apiJsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const candidate = payload as ApiFailurePayload;
  return candidate.error ?? candidate.message ?? fallback;
}

export async function readApiJson<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(messageFromPayload(payload, fallback));
  }
  return payload as T;
}

export function assertOperationSuccess(
  payload: ApiFailurePayload,
  fallback: string,
): void {
  if (payload.success === false) {
    throw new Error(messageFromPayload(payload, fallback));
  }
}

export async function encounterExists(
  encounterId: string,
  fetchImpl: FetchImpl,
): Promise<boolean> {
  const response = await fetchImpl(
    `/api/encounters/${encodeURIComponent(encounterId)}`,
  );
  if (response.ok) return true;
  if (response.status === 404) return false;
  await readApiJson(response, 'Failed to check existing encounter');
  return false;
}

export async function validateExistingEncounter(
  encounterId: string,
  fetchImpl: FetchImpl,
): Promise<IEncounterValidationResult> {
  const response = await fetchImpl(
    `/api/encounters/${encodeURIComponent(encounterId)}/validate`,
  );
  const payload = await readApiJson<EncounterValidationApiResponse>(
    response,
    'Failed to validate existing encounter',
  );
  const validation = payload.validation;
  if (
    !validation ||
    typeof validation.valid !== 'boolean' ||
    !Array.isArray(validation.errors) ||
    !validation.errors.every((error) => typeof error === 'string') ||
    !Array.isArray(validation.warnings) ||
    !validation.warnings.every((warning) => typeof warning === 'string') ||
    validation.valid !== (validation.errors.length === 0)
  ) {
    throw new Error('Failed to validate existing encounter');
  }
  return validation;
}
