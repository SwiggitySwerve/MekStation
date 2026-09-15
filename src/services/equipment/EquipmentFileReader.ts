import { logger } from '@/utils/logger';

import {
  EQUIPMENT_READ_ABORTED,
  type EquipmentReadOutcome,
} from './equipmentLoadAbort';

const isServer = typeof window === 'undefined';

/**
 * Decides whether a rejected fetch was our own cancellation.
 *
 * `AbortError` is the spec'd rejection and is conclusive on its own. An
 * unload-cancelled fetch can instead surface as a bare `TypeError: Failed to
 * fetch`, which is byte-for-byte what a real network failure looks like, so
 * that shape only counts as a cancellation while the signal we passed is
 * already aborted. Without an aborted signal, every rejection stays a failure.
 */
function isAbortRejection(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return true;
  }
  return (error as { name?: unknown } | null)?.name === 'AbortError';
}

export async function readJsonFile<T>(
  filePath: string,
  basePath: string,
  signal?: AbortSignal,
): Promise<EquipmentReadOutcome<T>> {
  if (isServer) {
    try {
      const fs = await import('fs').then((m) => m.promises);
      const path = await import('path');

      const publicDir = path.resolve(process.cwd(), 'public');
      const cleanBasePath = basePath.replace(/^\/+/, '');
      const cleanFilePath = filePath.replace(/^\/+/, '');
      const pathSegments = [publicDir, cleanBasePath, cleanFilePath].filter(
        Boolean,
      );
      const fullPath = path.resolve(...pathSegments);

      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      logger.warn(
        `[EquipmentLoaderService] Server-side read failed for ${filePath}:`,
        error,
      );
      return null;
    }
  }

  // Once the document is going away every remaining read is doomed; skip the
  // request instead of issuing ~30 fetches the browser will only cancel.
  if (signal?.aborted) {
    return EQUIPMENT_READ_ABORTED;
  }

  try {
    const response = await fetch(
      `${basePath}/${filePath}`,
      signal ? { signal } : undefined,
    );
    if (response.ok) {
      return (await response.json()) as T;
    }
    logger.warn(
      `[EquipmentLoaderService] Fetch failed for ${filePath}: ${response.status}`,
    );
    return null;
  } catch (error) {
    if (isAbortRejection(error, signal)) {
      return EQUIPMENT_READ_ABORTED;
    }
    logger.warn(`[EquipmentLoaderService] Fetch error for ${filePath}:`, error);
    return null;
  }
}
