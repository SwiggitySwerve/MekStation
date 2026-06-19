/**
 * Encounters API - Template
 *
 * PUT /api/encounters/[id]/template - Apply a scenario template
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initTemplateEncounterDb,
  rejectMissingQueryString as readTemplateEncounterId,
  rejectUnexpectedMethod as rejectTemplateMethod,
  sendCaughtApiError as sendTemplateEncounterError,
  sendOperationFailure as sendTemplateEncounterFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { IEncounter, ScenarioTemplateType } from '@/types/encounter';

const ENCOUNTERS_ID_TEMPLATE_TS_FAILED_TO_APPLY_TEMPLATE_1 =
  'Failed to apply template';

// =============================================================================
// Response Types
// =============================================================================

type TemplateResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TemplateResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initTemplateEncounterDb(res)) return;

  if (rejectTemplateMethod(req, res, ['PUT'])) return;

  const id = readTemplateEncounterId(
    req,
    res,
    'id',
    'Missing or invalid encounter ID',
  );
  if (!id) return;

  const { template } = req.body as { template?: ScenarioTemplateType };
  if (!template) {
    return res.status(400).json({ error: 'Missing required field: template' });
  }

  const encounterService = getEncounterService();

  try {
    const result = encounterService.applyTemplate(id, template);

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res
        .status(200)
        .json({ ...result, encounter: encounter || undefined });
    } else {
      sendTemplateEncounterFailure(
        res,
        result,
        ENCOUNTERS_ID_TEMPLATE_TS_FAILED_TO_APPLY_TEMPLATE_1,
      );
      return;
    }
  } catch (error) {
    sendTemplateEncounterError(
      res,
      error,
      ENCOUNTERS_ID_TEMPLATE_TS_FAILED_TO_APPLY_TEMPLATE_1,
    );
    return;
  }
}
