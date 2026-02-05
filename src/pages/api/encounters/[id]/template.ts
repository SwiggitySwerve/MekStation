/**
 * Encounters API - Template
 *
 * PUT /api/encounters/[id]/template - Apply a scenario template
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { IEncounter, ScenarioTemplateType } from '@/types/encounter';

// =============================================================================
// Response Types
// =============================================================================

type TemplateResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
};

type ErrorResponse = {
  error: string;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TemplateResponse | ErrorResponse>,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid encounter ID' });
  }

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
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to apply template',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to apply template';
    return res.status(500).json({ error: message });
  }
}
