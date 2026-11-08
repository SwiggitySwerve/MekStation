import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendCaughtApiError,
  sendOperationFailure,
} from '@/pages-modules/api/routeHelpers';
import { encounterSessionEvidenceError } from '@/services/encounter/EncounterLifecycle';
import { ENCOUNTER_SESSION_MAX_BYTES } from '@/services/encounter/encounterLifecycleClient';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';

export const config = {
  api: { bodyParser: { sizeLimit: '16mb' } },
};

/** Link local sessions (POST) or complete their terminal history (PATCH). */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): void {
  if (rejectUnexpectedMethod(req, res, ['POST', 'PATCH'])) return;
  const bytes = Number(req.headers['content-length']);
  if (Number.isFinite(bytes) && bytes > ENCOUNTER_SESSION_MAX_BYTES) {
    res.status(413).json({
      success: false,
      error: 'Encounter session history exceeds the request limit',
    });
    return;
  }
  const id = rejectMissingQueryString(
    req,
    res,
    'id',
    'Missing or invalid encounter ID',
  );
  if (!id) return;
  const body: unknown = req.body;
  if (
    !body ||
    typeof body !== 'object' ||
    !('gameId' in body) ||
    typeof body.gameId !== 'string' ||
    !('events' in body) ||
    !Array.isArray(body.events) ||
    !body.events.every(isGameEvent)
  ) {
    res.status(400).json({
      success: false,
      error: 'Game ID and event history are required',
    });
    return;
  }
  const error = encounterSessionEvidenceError(
    id,
    body.gameId,
    body.events,
    req.method === 'PATCH',
  );
  if (error) {
    res.status(400).json({ success: false, error });
    return;
  }
  if (!initializeApiDatabase(res)) return;
  try {
    const service = getEncounterService();
    const result =
      req.method === 'POST'
        ? service.linkGameSession(id, body.gameId, body.events)
        : service.completeEncounter(id, body.gameId, body.events);
    if (!result.success) {
      sendOperationFailure(res, result, 'Encounter session update failed');
      return;
    }
    res.status(200).json({ ...result, encounter: service.getEncounter(id) });
  } catch (error) {
    sendCaughtApiError(res, error, 'Encounter session update failed');
  }
}
