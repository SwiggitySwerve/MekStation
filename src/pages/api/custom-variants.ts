/**
 * Custom Variants API (DEPRECATED)
 *
 * @deprecated This endpoint is deprecated. Use /api/units/custom/* endpoints instead.
 *
 * The new API uses SQLite server-side storage for:
 * - Electron desktop apps (single-user)
 * - Self-hosted multi-user web apps
 * - Version history with revert capability
 *
 * New endpoints:
 * - GET/POST /api/units/custom - List and create units
 * - GET/PUT/DELETE /api/units/custom/[id] - Single unit operations
 * - GET /api/units/custom/[id]/versions - Version history
 * - POST /api/units/custom/[id]/revert/[version] - Revert to version
 * - GET /api/units/custom/[id]/export - Export as JSON
 * - POST /api/units/import - Import from JSON
 *
 * @spec openspec/specs/unit-services/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';

interface ApiResponse {
  success: boolean;
  deprecated: boolean;
  message: string;
  newApi: {
    baseUrl: string;
    endpoints: Record<string, string>;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  // Return deprecation notice for any method
  return res.status(410).json({
    success: false,
    deprecated: true,
    message:
      'This endpoint is deprecated. Please use /api/units/custom/* endpoints instead.',
    newApi: {
      baseUrl: '/api/units/custom',
      endpoints: {
        list: 'GET /api/units/custom',
        create: 'POST /api/units/custom',
        get: 'GET /api/units/custom/[id]',
        update: 'PUT /api/units/custom/[id]',
        delete: 'DELETE /api/units/custom/[id]',
        versions: 'GET /api/units/custom/[id]/versions',
        revert: 'POST /api/units/custom/[id]/revert/[version]',
        export: 'GET /api/units/custom/[id]/export',
        import: 'POST /api/units/import',
      },
    },
  });
}
