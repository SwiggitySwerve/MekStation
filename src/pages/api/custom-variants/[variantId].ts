/**
 * Custom Variant Detail API (DEPRECATED)
 * 
 * @deprecated This endpoint is deprecated. Use /api/units/custom/[id] endpoints instead.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';

interface ApiResponse {
  success: boolean;
  deprecated: boolean;
  message: string;
  redirect: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const { variantId } = req.query;
  const id = typeof variantId === 'string' ? variantId : '';

  // Return deprecation notice for any method
  return res.status(410).json({
    success: false,
    deprecated: true,
    message: 'This endpoint is deprecated. Please use /api/units/custom/[id] endpoints instead.',
    redirect: `/api/units/custom/${id}`,
  });
}
