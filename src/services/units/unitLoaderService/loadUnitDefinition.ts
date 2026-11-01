import { UnitContract } from '@/types/contracts';
import { isUnitFamily, type UnitFamily } from '@/types/unit/UnitIndex';

import type {
  IUnitDefinitionReader,
  IUnitDefinitionReference,
  UnitDefinitionLoadResult,
  FamilyUnitDefinitionLoadResult,
  UnitSource,
} from './definitionTypes';

import { getCanonicalUnitService } from '../CanonicalUnitService';
import { customUnitApiService } from '../CustomUnitApiService';
import { isDefinitionForFamily } from './definitionTypes';
import { unitContractIssues } from './unitContractIssues';

class MissingUnitFamilyError extends Error {}

const sourceReader: IUnitDefinitionReader = {
  async read(reference) {
    if (reference.source === 'custom')
      return customUnitApiService.getById(reference.id);
    const service = getCanonicalUnitService();
    const family = reference.family ?? 'battlemechs';
    if (!(await service.hasFamily(family))) {
      throw new MissingUnitFamilyError(
        `Canonical family "${family}" is not present`,
      );
    }
    return service.getById(reference.id, { family, strict: true });
  },
};

/** Loads a validated definition without equipment initialization or editor state. */
export function loadUnitDefinition(
  id: string,
): Promise<FamilyUnitDefinitionLoadResult<'battlemechs'>>;
export function loadUnitDefinition<F extends UnitFamily>(
  family: F,
  id: string,
  source?: UnitSource,
): Promise<FamilyUnitDefinitionLoadResult<F>>;
export function loadUnitDefinition(
  family: string,
  id: string,
  source?: UnitSource,
): Promise<UnitDefinitionLoadResult>;
/** Compatibility validation boundary for imports and caller-supplied readers. */
export function loadUnitDefinition(
  reader: IUnitDefinitionReader,
  reference: IUnitDefinitionReference,
): Promise<UnitDefinitionLoadResult>;
export async function loadUnitDefinition(
  readerOrFamily: IUnitDefinitionReader | string,
  referenceOrId?: IUnitDefinitionReference | string,
  source: UnitSource = 'canonical',
): Promise<UnitDefinitionLoadResult> {
  if (typeof readerOrFamily !== 'string') {
    if (typeof referenceOrId !== 'object')
      throw new TypeError('A unit definition reference is required');
    return validateUnitDefinition(
      readerOrFamily,
      referenceOrId,
      referenceOrId.family,
    );
  }
  const family =
    typeof referenceOrId === 'string' ? readerOrFamily : 'battlemechs';
  const id = typeof referenceOrId === 'string' ? referenceOrId : readerOrFamily;
  const result = await validateUnitDefinition(
    sourceReader,
    {
      source,
      id,
      ...(isUnitFamily(family) && family !== 'battlemechs' ? { family } : {}),
    },
    family,
  );
  // The canonical service caches the raw payload before validation; evict a
  // rejected one so a retry reads the corrected source, for every caller.
  if (
    !result.success &&
    result.code === 'invalid-definition' &&
    source === 'canonical' &&
    isUnitFamily(family)
  ) {
    getCanonicalUnitService().invalidateUnit(id, family);
  }
  return result;
}

async function validateUnitDefinition(
  reader: IUnitDefinitionReader,
  reference: IUnitDefinitionReference,
  family: string = 'battlemechs',
): Promise<UnitDefinitionLoadResult> {
  if (!isUnitFamily(family)) {
    return {
      success: false,
      reference,
      code: 'unknown-family',
      error: `Unknown unit family "${family}"`,
    };
  }
  let payload: unknown;
  try {
    payload = await reader.read(reference);
  } catch (error) {
    return {
      success: false,
      reference,
      code:
        error instanceof MissingUnitFamilyError
          ? 'family-not-found'
          : 'read-failed',
      error:
        error instanceof Error
          ? error.message
          : 'Failed to read unit definition',
    };
  }
  if (payload === null || payload === undefined) {
    return {
      success: false,
      reference,
      code: 'not-found',
      error: `${reference.source === 'canonical' ? 'Canonical' : 'Custom'} unit "${reference.id}" not found`,
    };
  }
  const parsed = UnitContract.safeParse(payload);
  if (!parsed.success || !isDefinitionForFamily(family, parsed.data)) {
    const issues = parsed.success
      ? [
          {
            path: 'unitType',
            message: `Unit type ${parsed.data.unitType} does not belong to family ${family}`,
          },
        ]
      : unitContractIssues(parsed.error.issues);
    return {
      success: false,
      reference,
      code: 'invalid-definition',
      error: `Invalid unit definition "${reference.id}": ${issues
        .slice(0, 3)
        .map((issue) => `${issue.path || '<root>'}: ${issue.message}`)
        .join('; ')}`,
      issues,
    };
  }
  const version = parsed.data.currentVersion;
  return {
    success: true,
    definition: parsed.data,
    family,
    reference: {
      source: reference.source,
      id: reference.id,
      ...(family !== 'battlemechs' ? { family } : {}),
      ...(reference.source === 'custom' &&
      typeof version === 'number' &&
      Number.isSafeInteger(version) &&
      version > 0
        ? { version }
        : {}),
    },
  };
}
