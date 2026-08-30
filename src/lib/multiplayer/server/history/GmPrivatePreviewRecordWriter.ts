/**
 * Server-only producer for unfinalized GM intervention data.
 *
 * GM preview computation remains on the existing intervention surface
 * today. When the 14.1 correction-routing surface receives that preview,
 * it calls this writer; this seam persists only private records and emits
 * no player-visible marker, event, history row, or wire frame.
 */

import type {
  IPrivateRecordOpenView,
  IPrivateRecordRepository,
} from '@/lib/events/privacy/IPrivateRecordRepository';

import { PrivateRecordError } from '@/lib/events/privacy/IPrivateRecordRepository';

import type { AuthorizedViewerResolver } from '../authorization/AuthorizedViewer';

export interface IStoreGmPrivatePreviewInput {
  readonly resolver: AuthorizedViewerResolver;
  readonly principalId: string;
  readonly campaignSessionId: string;
  readonly commandId: string | null;
  readonly createdAt: string;
  readonly preview?: unknown;
  readonly derivedSummary?: string;
  readonly privateReason?: string;
}

export interface IGmPrivatePreviewRecords {
  readonly preview?: IPrivateRecordOpenView;
  readonly reason?: IPrivateRecordOpenView;
}

/**
 * The authorized ingress for GM previews and private reasons. It is not
 * a correction router: callers receive only private opaque references,
 * and public correction publication remains the later 14.1 concern.
 */
export class GmPrivatePreviewRecordWriter {
  public constructor(
    private readonly privateRecords: IPrivateRecordRepository,
  ) {}

  public async store(
    input: IStoreGmPrivatePreviewInput,
  ): Promise<IGmPrivatePreviewRecords> {
    if (input.preview === undefined && input.privateReason === undefined) {
      throw new PrivateRecordError(
        'invalid-record',
        'GM private record write requires a preview or private reason',
      );
    }

    const preview =
      input.preview === undefined
        ? undefined
        : await this.privateRecords.createAuthorizedPrivateRecord({
            resolver: input.resolver,
            principalId: input.principalId,
            matchId: input.campaignSessionId,
            campaignSessionId: input.campaignSessionId,
            commandId: input.commandId,
            recordKind: 'gm-draft',
            payload: serializePreview(input.preview, input.derivedSummary),
            retentionClass: 'session',
            createdAt: input.createdAt,
            occurredAt: input.createdAt,
          });
    const reason =
      input.privateReason === undefined
        ? undefined
        : await this.privateRecords.createAuthorizedPrivateRecord({
            resolver: input.resolver,
            principalId: input.principalId,
            matchId: input.campaignSessionId,
            campaignSessionId: input.campaignSessionId,
            commandId: input.commandId,
            recordKind: 'gm-reason',
            payload: input.privateReason,
            retentionClass: 'session',
            createdAt: input.createdAt,
            occurredAt: input.createdAt,
          });
    return Object.freeze({ preview, reason });
  }
}

/** The private draft body retains the full preview and its GM summary. */
function serializePreview(
  preview: unknown,
  derivedSummary: string | undefined,
): string {
  if (derivedSummary === undefined || derivedSummary.trim().length === 0) {
    throw new PrivateRecordError(
      'invalid-record',
      'GM preview records require a nonempty derived summary',
    );
  }
  const payload = JSON.stringify({ preview, derivedSummary });
  if (payload === undefined) {
    throw new PrivateRecordError(
      'invalid-record',
      'GM preview is not serializable',
    );
  }
  return payload;
}
