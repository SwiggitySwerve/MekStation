import type {
  ActionLedgerInterventionRecordInput,
  ActionLedgerProjectionVisibility,
  GmActionLedgerRecordFromIntervention,
  IActionLedgerAppendInput,
  IActionLedgerNormalActionInput,
  IActionLedgerRecord,
  IGmVisibleActionLedgerRecord,
  IPlayerVisibleActionLedgerRecord,
  NormalActionLedgerRecord,
} from '@/types/interventions';

export class ActionLedger {
  private readonly records: IActionLedgerRecord[] = [];

  private nextSequence = 1;

  appendNormalAction<TPublic>(
    input: IActionLedgerNormalActionInput<TPublic>,
  ): NormalActionLedgerRecord<TPublic> {
    const record = this.append({
      ...input,
      recordKind: 'normal',
      actorRole: input.actorRole ?? 'player',
      status: 'committed',
    }) as NormalActionLedgerRecord<TPublic>;

    return record;
  }

  appendSystemAction<TPublic>(
    input: Omit<
      IActionLedgerAppendInput<TPublic, undefined, undefined>,
      'recordKind' | 'actorRole' | 'status'
    >,
  ): IActionLedgerRecord<TPublic, undefined, undefined> {
    return this.append({
      ...input,
      recordKind: 'system',
      actorRole: 'system',
      status: 'committed',
    });
  }

  appendGmInterventionRecord<TPrivate, TPublic, TDomainPayload>(
    record: ActionLedgerInterventionRecordInput<
      TPrivate,
      TPublic,
      TDomainPayload
    >,
  ): GmActionLedgerRecordFromIntervention<TPrivate, TPublic, TDomainPayload> {
    const actionRecord = this.append({
      id: `action:${record.id}`,
      recordKind: 'gm-intervention',
      actorId: record.actorId,
      actorRole: 'gm',
      domain: record.domain,
      action: record.kind,
      status: record.status === 'manual' ? 'manual' : 'approved',
      targetRefs: record.targetRefs,
      publicEffect: record.publicEffect,
      privateMetadata: record.privateMetadata,
      domainPayload: record.domainPayload,
      causedBy: record.causedBy,
      supersedes: record.supersedes,
      interventionRecordId: record.id,
      createdAt: record.createdAt,
      approvedAt: record.approvedAt,
    }) as GmActionLedgerRecordFromIntervention<
      TPrivate,
      TPublic,
      TDomainPayload
    >;

    return actionRecord;
  }

  projectForPlayer<
    TPublic = unknown,
  >(): IPlayerVisibleActionLedgerRecord<TPublic>[] {
    return this.records.map((record) => this.toPlayerProjection(record));
  }

  projectForGm<
    TPublic = unknown,
    TPrivate = unknown,
    TDomainPayload = unknown,
  >(): IGmVisibleActionLedgerRecord<TPublic, TPrivate, TDomainPayload>[] {
    return this.records.map((record) => this.toGmProjection(record));
  }

  project<TPublic = unknown, TPrivate = unknown, TDomainPayload = unknown>(
    visibility: ActionLedgerProjectionVisibility,
  ):
    | IPlayerVisibleActionLedgerRecord<TPublic>[]
    | IGmVisibleActionLedgerRecord<TPublic, TPrivate, TDomainPayload>[] {
    return visibility === 'public'
      ? this.projectForPlayer<TPublic>()
      : this.projectForGm<TPublic, TPrivate, TDomainPayload>();
  }

  getRecords(): readonly IActionLedgerRecord[] {
    return [...this.records];
  }

  private append<TPublic, TPrivate, TDomainPayload>(
    input: IActionLedgerAppendInput<TPublic, TPrivate, TDomainPayload>,
  ): IActionLedgerRecord<TPublic, TPrivate, TDomainPayload> {
    const record: IActionLedgerRecord<TPublic, TPrivate, TDomainPayload> = {
      ...input,
      sequence: this.nextSequence,
    };

    this.nextSequence += 1;
    this.records.push(record);
    return record;
  }

  private toPlayerProjection<TPublic>(
    record: IActionLedgerRecord,
  ): IPlayerVisibleActionLedgerRecord<TPublic> {
    return {
      id: record.id,
      sequence: record.sequence,
      recordKind: record.recordKind,
      actorId: record.actorId,
      actorRole: record.actorRole,
      domain: record.domain,
      action: record.action,
      status: record.status,
      targetRefs: record.targetRefs,
      publicEffect: record.publicEffect as TPublic,
      causedBy: record.causedBy,
      supersedes: record.supersedes,
      interventionRecordId: record.interventionRecordId,
      createdAt: record.createdAt,
      approvedAt: record.approvedAt,
    };
  }

  private toGmProjection<TPublic, TPrivate, TDomainPayload>(
    record: IActionLedgerRecord,
  ): IGmVisibleActionLedgerRecord<TPublic, TPrivate, TDomainPayload> {
    return {
      ...this.toPlayerProjection<TPublic>(record),
      privateMetadata: record.privateMetadata as TPrivate | undefined,
      domainPayload: record.domainPayload as TDomainPayload | undefined,
    };
  }
}
