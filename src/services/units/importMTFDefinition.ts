import type { ResultType } from '@/types/common/result';
import type { IUnitContract } from '@/types/contracts';
import type { IImportError } from '@/types/persistence/UnitPersistence';

import { MTFParserService } from '@/services/conversion/MTFParserService';

import { loadUnitDefinition } from './unitLoaderService/loadUnitDefinition';

/** Parse source text and apply the same structural admission as saved units. */
export async function importMTFDefinition(sourceText: unknown): Promise<
  ResultType<
    {
      readonly definition: IUnitContract;
      readonly warnings: readonly string[];
    },
    IImportError
  >
> {
  if (typeof sourceText !== 'string' || !sourceText.trim()) {
    return {
      success: false,
      error: { message: 'Missing or invalid field: sourceText' },
    };
  }
  const parsed = new MTFParserService().parse(sourceText);
  if (!parsed.success || !parsed.unit) {
    return {
      success: false,
      error: {
        message: 'MTF source parsing failed',
        validationErrors: parsed.errors,
        warnings: parsed.warnings,
      },
    };
  }
  const loaded = await loadUnitDefinition(
    { read: async () => parsed.unit },
    { source: 'custom', id: parsed.unit.id },
  );
  if (!loaded.success) {
    return {
      success: false,
      error: {
        message: loaded.error,
        validationErrors: loaded.issues?.map(
          (issue) => `${issue.path}: ${issue.message}`,
        ),
        warnings: parsed.warnings,
      },
    };
  }
  return {
    success: true,
    data: { definition: loaded.definition, warnings: parsed.warnings },
  };
}
