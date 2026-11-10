/**
 * The route half of the contract-rules reader gate (S1b): turns the pure
 * verdict from `lifecycleReaderGate` into a response. Every route that serves
 * or accepts a campaign body with contracts calls this AFTER its auth verdict
 * and BEFORE any 409 that could carry the stored record, so a reader that
 * cannot process a contract never receives it through the conflict path.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  judgeLifecycleGate,
  lifecycleRefusalBody,
  lifecycleUpgradeValue,
  type ILifecycleGateInput,
} from '@/lib/campaign/persistence/lifecycleReaderGate';
import {
  LIFECYCLE_RULES_REQUEST_HEADER,
  readLifecycleReaderHeader,
} from '@/types/campaign/ContractLifecycleRules';

/** Response header naming why a read-only response was served. */
export const LIFECYCLE_DIAGNOSTIC_HEADER = 'X-MekStation-Lifecycle-Diagnostic';

/** Marks a response as varying by the caller's declared reader level. */
export function varyByLifecycleRules(res: NextApiResponse): void {
  const current = res.getHeader('Vary');
  const tokens = (Array.isArray(current) ? current : [String(current ?? '')])
    .flatMap((value) => value.split(','))
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (
    !tokens.some(
      (token) =>
        token.toLowerCase() === LIFECYCLE_RULES_REQUEST_HEADER.toLowerCase(),
    )
  ) {
    tokens.push(LIFECYCLE_RULES_REQUEST_HEADER);
  }
  res.setHeader('Vary', tokens.join(', '));
}

/**
 * True when the gate refused and has already answered; the caller returns.
 * A read-only verdict sets a diagnostic header and lets the route continue.
 */
export function refuseCampaignLifecycle(
  req: NextApiRequest,
  res: NextApiResponse,
  input: Omit<ILifecycleGateInput, 'reader'>,
): boolean {
  const reader = readLifecycleReaderHeader(
    req.headers[LIFECYCLE_RULES_REQUEST_HEADER.toLowerCase()],
  );
  const verdict = judgeLifecycleGate({ ...input, reader });
  if (verdict.kind === 'allow') return false;
  if (verdict.kind === 'allow-read-only') {
    res.setHeader(LIFECYCLE_DIAGNOSTIC_HEADER, verdict.diagnostic);
    return false;
  }
  const upgrade = lifecycleUpgradeValue(verdict);
  if (upgrade !== null) res.setHeader('Upgrade', upgrade);
  res.setHeader('Cache-Control', 'no-store');
  res.status(verdict.status).json(lifecycleRefusalBody(verdict));
  return true;
}
