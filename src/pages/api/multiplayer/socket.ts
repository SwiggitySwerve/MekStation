/**
 * Multiplayer WebSocket placeholder route.
 *
 * The actual WebSocket upgrade happens in `server.js` at the repo root,
 * which intercepts HTTP requests on the `/api/multiplayer/socket` path
 * before they reach Next.js's request handler. This file exists so:
 *   - clients hitting the path with a regular HTTP request get a clear
 *     426 "Upgrade Required" response instead of a 404
 *   - Next.js doesn't 404-log the path during dev
 *   - Wave 5's UI can probe the endpoint to verify the server is up
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface IUpgradeRequiredResponse {
  error: string;
  hint: string;
}

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<IUpgradeRequiredResponse>,
): void {
  res.setHeader('Connection', 'Upgrade');
  res.setHeader('Upgrade', 'websocket');
  res.status(426).json({
    error: 'Upgrade Required',
    hint: 'Open a WebSocket connection to /api/multiplayer/socket?matchId=...&token=...',
  });
}
