import type {
  IPilot,
  IPilotAbilityDesignation,
  ISPADesignation,
} from '@/types/pilot';

import { getSPADefinition, resolveSPAId } from '@/lib/spa';
import {
  SPA_DESIGNATION_SCHEMA,
  catalogDesignationToKind,
} from '@/types/pilot';

import type {
  IPilotOperationResult,
  IPilotRepository,
} from './PilotRepository';

import { PilotErrorCode as PilotError } from './PilotRepository';

export function purchasePilotSPA(
  repo: IPilotRepository,
  pilotId: string,
  spaId: string,
  options?: {
    designation?: IPilotAbilityDesignation;
    isCreationFlow?: boolean;
  },
): IPilotOperationResult {
  const pilot = repo.getById(pilotId);
  if (!pilot) return pilotNotFound(pilotId);

  const spa = getSPADefinition(spaId);
  if (!spa) {
    return validationError(`Unknown SPA: ${spaId}`);
  }

  if (pilot.abilities.some((a) => a.abilityId === spa.id)) {
    return validationError(`Pilot already has SPA: ${spa.displayName}`);
  }

  const isCreationFlow = options?.isCreationFlow === true;
  if (spa.isOriginOnly && !isCreationFlow) {
    return validationError(
      `${spa.displayName} can only be taken at pilot creation`,
    );
  }
  if (spa.isFlaw && !isCreationFlow) {
    return validationError('Flaws can only be taken at pilot creation');
  }

  const designationError = validateDesignation(spa, options?.designation);
  if (designationError) return validationError(designationError);

  const xpCost = spa.xpCost ?? 0;
  const xpResult = applySpaXp(repo, pilotId, pilot, xpCost);
  if (xpResult) return xpResult;

  const addResult = repo.addAbility(
    pilotId,
    spa.id,
    undefined,
    options?.designation,
    xpCost,
  );

  if (!addResult.success) {
    rollbackSpaXp(repo, pilotId, xpCost);
    return addResult;
  }

  return { success: true, id: pilotId };
}

export function removePilotSPA(
  repo: IPilotRepository,
  pilotId: string,
  spaId: string,
  options?: { isCreationFlow?: boolean },
): IPilotOperationResult {
  if (options?.isCreationFlow !== true) {
    return validationError('Abilities cannot be removed after pilot creation');
  }

  const pilot = repo.getById(pilotId);
  if (!pilot) return pilotNotFound(pilotId);

  const ref = pilot.abilities.find((a) => a.abilityId === spaId);
  if (!ref) return validationError(`Pilot does not have SPA: ${spaId}`);

  const fallback = getSPADefinition(spaId)?.xpCost ?? 0;
  const recorded = ref.xpSpent ?? fallback;
  const removeResult = repo.removeAbility(pilotId, spaId);
  if (!removeResult.success) return removeResult;

  if (recorded > 0) {
    const refundResult = repo.refundXp(pilotId, recorded);
    if (!refundResult.success) return refundResult;
  } else if (recorded < 0) {
    const debitResult = repo.spendXp(pilotId, Math.abs(recorded));
    if (!debitResult.success) return debitResult;
  }

  return { success: true, id: pilotId };
}

export function getPilotSPADesignation(
  pilot: IPilot,
  spaId: string,
): ISPADesignation | undefined {
  const canonical = resolveSPAId(spaId);
  if (!canonical) return undefined;
  const ref = pilot.abilities.find(
    (a) => resolveSPAId(a.abilityId) === canonical,
  );
  return ref?.designation;
}

function validateDesignation(
  spa: NonNullable<ReturnType<typeof getSPADefinition>>,
  designation: IPilotAbilityDesignation | undefined,
): string | null {
  if (!spa.requiresDesignation) return null;
  if (!designation) return `Designation required for ${spa.displayName}`;
  if (spa.designationType) {
    const expectedKind = catalogDesignationToKind(spa.designationType);
    if (designation.kind !== expectedKind) {
      return `Designation type mismatch - expected ${expectedKind}, got ${designation.kind}`;
    }
  }
  const parsed = SPA_DESIGNATION_SCHEMA.safeParse(designation);
  if (!parsed.success) {
    return `Invalid designation payload: ${
      parsed.error.issues[0]?.message ?? 'validation failed'
    }`;
  }
  return null;
}

function applySpaXp(
  repo: IPilotRepository,
  pilotId: string,
  pilot: IPilot,
  xpCost: number,
): IPilotOperationResult | null {
  if (xpCost > 0) {
    const availableXp = pilot.career?.xp ?? 0;
    if (availableXp < xpCost) {
      return {
        success: false,
        error: `Insufficient XP. Need ${xpCost}, have ${availableXp}`,
        errorCode: PilotError.InsufficientXp,
      };
    }
    const spendResult = repo.spendXp(pilotId, xpCost);
    return spendResult.success ? null : spendResult;
  }
  if (xpCost < 0) {
    const refundResult = repo.refundXp(pilotId, Math.abs(xpCost));
    return refundResult.success ? null : refundResult;
  }
  return null;
}

function rollbackSpaXp(
  repo: IPilotRepository,
  pilotId: string,
  xpCost: number,
): void {
  if (xpCost > 0) {
    repo.refundXp(pilotId, xpCost);
  } else if (xpCost < 0) {
    repo.spendXp(pilotId, Math.abs(xpCost));
  }
}

function pilotNotFound(pilotId: string): IPilotOperationResult {
  return {
    success: false,
    error: `Pilot ${pilotId} not found`,
    errorCode: PilotError.NotFound,
  };
}

function validationError(error: string): IPilotOperationResult {
  return {
    success: false,
    error,
    errorCode: PilotError.ValidationError,
  };
}
