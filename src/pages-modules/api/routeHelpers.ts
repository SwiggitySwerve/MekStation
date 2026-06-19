import type { NextApiRequest, NextApiResponse } from 'next';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

type JsonBody = Record<string, unknown>;

export type ApiErrorResponse = {
  error: string;
  code?: string;
};

export interface ApiDataResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  count?: number;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function initializeApiDatabase(
  res: NextApiResponse,
  buildBody: (message: string) => JsonBody = (message) => ({ error: message }),
): boolean {
  try {
    getSQLiteService().initialize();
    return true;
  } catch (error) {
    res
      .status(500)
      .json(
        buildBody(apiErrorMessage(error, 'Database initialization failed')),
      );
    return false;
  }
}

export function rejectUnexpectedMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  allowed: readonly string[],
  buildBody: (method: string | undefined) => JsonBody = (method) => ({
    error: `Method ${method} Not Allowed`,
  }),
): boolean {
  if (allowed.includes(req.method ?? '')) return false;
  res.setHeader('Allow', allowed);
  res.status(405).json(buildBody(req.method));
  return true;
}

export function rejectUnlessGet(
  req: NextApiRequest,
  res: NextApiResponse,
  buildBody: () => JsonBody = () => ({ message: 'Method not allowed' }),
): boolean {
  if (req.method === 'GET') return false;
  res.status(405).json(buildBody());
  return true;
}

export function rejectNonGetDataRequest(
  req: NextApiRequest,
  res: NextApiResponse,
): boolean {
  return rejectUnlessGet(req, res, () => ({
    success: false,
    error: 'Method not allowed. Use GET.',
  }));
}

export function queryStringParam(
  req: NextApiRequest,
  name: string,
): string | undefined {
  const value = req.query[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function rejectMissingQueryString(
  req: NextApiRequest,
  res: NextApiResponse,
  name: string,
  error: string,
): string | undefined {
  const value = queryStringParam(req, name);
  if (value) return value;
  res.status(400).json({ error });
  return undefined;
}

export function sendCaughtApiError(
  res: NextApiResponse,
  error: unknown,
  fallback: string,
): void {
  res.status(500).json({ error: apiErrorMessage(error, fallback) });
}

export function sendLoggedApiError(
  res: NextApiResponse,
  label: string,
  error: unknown,
): void {
  console.error(label, error);
  res.status(500).json({
    error: apiErrorMessage(error, 'Internal server error'),
  });
}

export function sendLoggedMessageApiError(
  res: NextApiResponse,
  label: string,
  error: unknown,
): void {
  console.error(label, error);
  res.status(500).json({ message: 'Internal server error' });
}

export function sendLoggedSuccessApiError(
  res: NextApiResponse,
  label: string,
  error: unknown,
): void {
  console.error(label, error);
  res.status(500).json({
    success: false,
    error: apiErrorMessage(error, 'Internal server error'),
  });
}

export function sendOperationFailure(
  res: NextApiResponse,
  result: { readonly error?: string; readonly errorCode?: string },
  fallback: string,
): void {
  res.status(400).json({
    success: false,
    error: result.error || fallback,
    errorCode: result.errorCode,
  });
}

export function respondToStaticGetRequest<T>(
  req: NextApiRequest,
  res: NextApiResponse,
  value: T,
  logLabel: string,
): void {
  if (rejectUnlessGet(req, res)) return;
  try {
    res.status(200).json(value);
  } catch (error) {
    sendLoggedMessageApiError(res, logLabel, error);
  }
}
