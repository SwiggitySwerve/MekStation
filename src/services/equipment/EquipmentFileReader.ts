import { logger } from '@/utils/logger';

const isServer = typeof window === 'undefined';

export async function readJsonFile<T>(
  filePath: string,
  basePath: string,
): Promise<T | null> {
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

  try {
    const response = await fetch(`${basePath}/${filePath}`);
    if (response.ok) {
      return (await response.json()) as T;
    }
    logger.warn(
      `[EquipmentLoaderService] Fetch failed for ${filePath}: ${response.status}`,
    );
    return null;
  } catch (error) {
    logger.warn(`[EquipmentLoaderService] Fetch error for ${filePath}:`, error);
    return null;
  }
}
