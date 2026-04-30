/**
 * Encounters API - Launch
 *
 * POST /api/encounters/[id]/launch - Launch an encounter (start game session)
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import {
  getEncounterService,
  type ILaunchEncounterOptions,
} from '@/services/encounter/EncounterService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { IEncounter } from '@/types/encounter';

// =============================================================================
// Response Types
// =============================================================================

type LaunchResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
  gameSessionId?: string;
};

type ErrorResponse = {
  error: string;
};

function readOptionalId(
  body: Record<string, unknown>,
  key: keyof ILaunchEncounterOptions,
): string | null | undefined {
  const value = body[key];
  if (typeof value === 'string' || value === null) {
    return value;
  }
  return undefined;
}

function parseLaunchOptions(body: unknown): ILaunchEncounterOptions {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }

  const record = body as Record<string, unknown>;
  return {
    campaignId: readOptionalId(record, 'campaignId'),
    contractId: readOptionalId(record, 'contractId'),
    scenarioId: readOptionalId(record, 'scenarioId'),
  };
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LaunchResponse | ErrorResponse>,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid encounter ID' });
  }

  const encounterService = getEncounterService();

  try {
    const result = encounterService.launchEncounter(
      id,
      parseLaunchOptions(req.body),
    );

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res.status(200).json({
        ...result,
        encounter: encounter || undefined,
        gameSessionId: encounter?.gameSessionId,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to launch encounter',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to launch encounter';
    return res.status(500).json({ error: message });
  }
}
