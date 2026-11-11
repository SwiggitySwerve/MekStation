import { isDeepStrictEqual } from 'node:util';

import type { ReloadTiming } from './campaignUnload';

import { isJsonRecord, putBaseVersion } from './browserWriteComparison';
import {
  envelopeOf,
  compareCampaignPutRecord,
  type CampaignRecord,
  type CapturedCampaignPut,
} from './unloadFlushEvidence';

export type DeliveryClass =
  | 'delivered-observed'
  | 'delivered-observed-ordinary-save'
  | 'delivered-by-chain'
  | 'undelivered'
  | 'unattributable';

export interface ContextCampaignWrite {
  url: string;
  method: string;
  postData: string | null;
  elapsedMs: number;
  serviceWorker: string | null;
  resourceType: string;
  status: number | null;
  failure: string | null;
  finishedMs: number | null;
}

export interface CampaignPollTrace {
  /** Full first record of each version, plus every transition (including regressions). */
  startedEpochMs: number;
  versions: { elapsedMs: number; record: CampaignRecord }[];
  samples: { startedMs: number; elapsedMs: number; version: number }[];
  errors: { elapsedMs: number; message: string }[];
  stoppedMs: number;
}

export interface DeliveryResult {
  class: DeliveryClass;
  reason: string;
  /** Historical compatibility results without poll/context evidence cannot pass. */
  eligible: boolean;
  firstObservedMs: number | null;
  chainVersions: number[];
  pollMissedVersions: number[];
}

function matches(record: CampaignRecord, put: CapturedCampaignPut): boolean {
  const comparison = compareCampaignPutRecord(record, put);
  return comparison.bodyMatches && comparison.savedAtMatches;
}

/** Payload dispatches are not receipts. CAS chain inference requires an exact
 * successor for every captured PUT, no duplicate base, no unexplained observed
 * revision, and context/page agreement. Worker writes are kept as potential
 * extra writers, never silently deduplicated against a page request.
 */
export function classifyUnloadDelivery(input: {
  puts: readonly CapturedCampaignPut[];
  before: CampaignRecord;
  after: CampaignRecord;
  valuesPresent: boolean;
  poll?: CampaignPollTrace;
  contextWrites?: readonly ContextCampaignWrite[];
  captureAvailable?: boolean;
  timing?: Pick<
    ReloadTiming,
    'expectedDate' | 'expectedMatchId' | 'pagehideMs'
  >;
}): DeliveryResult {
  const { puts, before, after, poll, contextWrites } = input;
  const flushes = puts.filter((put) => put.keepalive);
  const flush = flushes.length === 1 ? flushes[0] : undefined;
  const observed = flush
    ? poll?.versions.find(
        ({ record }) =>
          record.version === before.version + 1 && matches(record, flush),
      )
    : undefined;
  const chainVersions = puts.map((_, index) => before.version + index + 1);
  const pollMissedVersions = chainVersions.filter(
    (version) =>
      !poll?.versions.some(({ record }) => record.version === version),
  );
  const eligible = Boolean(
    poll &&
    poll.samples.length > 0 &&
    poll.errors.length === 0 &&
    contextWrites &&
    input.captureAvailable,
  );
  const result = (
    classification: DeliveryClass,
    reason: string,
    firstObservedMs = observed?.elapsedMs ?? null,
  ): DeliveryResult => ({
    class: classification,
    reason,
    eligible,
    firstObservedMs,
    chainVersions,
    pollMissedVersions,
  });
  if (flushes.length > 1)
    return result('unattributable', 'Several keepalive PUTs');
  if (!input.valuesPresent || (after.version === before.version && !observed))
    return result(
      'undelivered',
      'Expected values absent at end, or row never advanced',
    );
  // An ordinary save may beat pagehide and race the flush at the same CAS
  // base. Only a direct receipt proves it; neither final values nor a chain
  // can substitute for the captured edit, dispatch timing and exact poll row.
  const ordinaryObserved = eligible
    ? poll?.versions.find(({ record }) =>
        puts.some((put) => {
          const body = envelopeOf(put)?.body;
          const timing = input.timing;
          const carriesEdit =
            isJsonRecord(body) &&
            (timing?.expectedMatchId
              ? Array.isArray(body.pendingBattleOutcomes) &&
                body.pendingBattleOutcomes.some(
                  (outcome: unknown) =>
                    isJsonRecord(outcome) &&
                    outcome.matchId === timing.expectedMatchId,
                )
              : typeof timing?.expectedDate === 'string' &&
                body.currentDate === timing.expectedDate);
          return (
            put.keepalive === false &&
            putBaseVersion(put.postData) === before.version &&
            timing !== undefined &&
            Number.isFinite(timing.pagehideMs) &&
            timing.pagehideMs > 0 &&
            typeof put.sinceEditMs === 'number' &&
            Number.isFinite(put.sinceEditMs) &&
            put.sinceEditMs >= 0 &&
            put.sinceEditMs <= timing.pagehideMs &&
            (put.sincePagehideMs === null || put.sincePagehideMs === 0) &&
            carriesEdit &&
            record.version === before.version + 1 &&
            matches(record, put) &&
            contextWrites?.some(
              (write) =>
                !write.serviceWorker &&
                write.method === 'PUT' &&
                write.url === put.url &&
                write.postData === put.postData,
            ) &&
            puts.filter((candidate) => matches(record, candidate)).length === 1
          );
        }),
      )
    : undefined;
  if (ordinaryObserved)
    return result(
      'delivered-observed-ordinary-save',
      'API poll directly saw ordinary save base + 1 with exact body and savedAt, carrying the edit and sent at or before pagehide',
      ordinaryObserved.elapsedMs,
    );
  if (
    !flush ||
    puts[0] !== flush ||
    putBaseVersion(flush.postData) !== before.version
  )
    return result('unattributable', 'Missing flush at the initial base');
  if (poll && (poll.errors.length > 0 || poll.samples.length === 0))
    return result('unattributable', 'Missing/failed poll samples');
  if (contextWrites) {
    const remaining = [...contextWrites];
    for (const put of puts) {
      const index = remaining.findIndex(
        (write) =>
          !write.serviceWorker &&
          write.method === 'PUT' &&
          write.url === put.url &&
          write.postData === put.postData,
      );
      if (index < 0)
        return result(
          'unattributable',
          'Page PUT missing from context capture',
        );
      remaining.splice(index, 1);
    }
    if (remaining.length > 0)
      return result(
        'unattributable',
        'Extra context write (including SW, XHR or beacon); cannot infer a sole writer',
      );
  }
  for (const [index, put] of puts.entries()) {
    const envelope = envelopeOf(put);
    if (
      putBaseVersion(put.postData) !== before.version + index ||
      !envelope ||
      !isJsonRecord(envelope.body) ||
      typeof envelope.savedAt !== 'string'
    )
      return result(
        'unattributable',
        'Duplicate base, gap, or unreadable PUT in chain',
      );
  }
  const last = puts[puts.length - 1];
  if (after.version !== before.version + puts.length || !matches(after, last))
    return result(
      'unattributable',
      'Final version/body/savedAt does not close captured chain',
    );
  let previousVersion = before.version;
  for (const sample of poll?.versions ?? []) {
    const { record } = sample;
    if (record.version < previousVersion)
      return result('unattributable', 'Poll saw version regression');
    previousVersion = record.version;
    if (record.version === before.version) {
      if (!isDeepStrictEqual(record, before))
        return result('unattributable', 'Poll saw a changed initial revision');
    } else {
      const put = puts[record.version - before.version - 1];
      if (!put || !matches(record, put))
        return result(
          'unattributable',
          'Poll saw an uncaptured version or mismatching body/savedAt',
        );
    }
  }
  if (poll && (!contextWrites || !input.captureAvailable))
    return result(
      'unattributable',
      'Context capture unavailable for attribution',
    );
  return observed
    ? result(
        'delivered-observed',
        'API poll directly saw flush base + 1 with exact body and savedAt',
      )
    : result(
        'delivered-by-chain',
        poll
          ? 'Unbroken captured CAS chain closes at final row; poll saw no unexplained version'
          : 'HISTORICAL ONLY: structural chain fits; absent poll/context cannot exclude uncaptured versions or writers',
      );
}
