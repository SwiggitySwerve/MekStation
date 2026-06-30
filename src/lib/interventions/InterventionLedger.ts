import type {
  IInterventionLedgerCommand,
  IInterventionLedgerImplementer,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
  InterventionApplyResult,
  InterventionDomain,
  InterventionProjectionVisibility,
} from '@/types/interventions';

export interface IInterventionLedgerOptions {
  readonly unsupportedReason?: (domain: InterventionDomain) => string;
}

const defaultUnsupportedReason = (domain: InterventionDomain): string =>
  `No intervention ledger implementer registered for domain "${domain}".`;

export class InterventionLedger<TState = unknown> {
  private readonly implementers = new Map<
    InterventionDomain,
    IInterventionLedgerImplementer<IInterventionLedgerCommand, TState>
  >();

  private readonly records: IInterventionLedgerRecord[] = [];

  constructor(private readonly options: IInterventionLedgerOptions = {}) {}

  register(
    implementer: IInterventionLedgerImplementer<
      IInterventionLedgerCommand,
      TState
    >,
  ): this {
    if (this.implementers.has(implementer.domain)) {
      throw new Error(
        `Intervention ledger implementer already registered for domain "${implementer.domain}".`,
      );
    }

    this.implementers.set(implementer.domain, implementer);
    return this;
  }

  preview(
    command: IInterventionLedgerCommand,
    state: TState,
  ): IInterventionLedgerPreview {
    const implementer = this.implementers.get(command.domain);
    if (!implementer) {
      return {
        domain: command.domain,
        kind: command.kind,
        status: 'unsupported',
        actorId: command.actorId,
        targetRefs: command.targetRefs,
        causedBy: command.causedBy,
        supersedes: command.supersedes,
        conflicts: [],
        reason: this.unsupportedReason(command.domain),
      };
    }

    return implementer.preview(command, state);
  }

  appendApprovedRecord(
    record: IInterventionLedgerRecord,
  ): IInterventionLedgerRecord {
    if (record.status !== 'approved' && record.status !== 'manual') {
      throw new Error(
        `Cannot append intervention record "${record.id}" with status "${record.status}".`,
      );
    }

    const immutableRecord = freezeInterventionRecord(record);
    this.records.push(immutableRecord);
    return immutableRecord;
  }

  apply(
    record: IInterventionLedgerRecord,
    state: TState,
  ): InterventionApplyResult<TState> {
    const implementer = this.implementers.get(record.domain);
    if (!implementer) {
      return {
        status: 'unsupported',
        domain: record.domain,
        kind: record.kind,
        reason: this.unsupportedReason(record.domain),
        state,
      };
    }

    return {
      status: 'applied',
      domain: record.domain,
      record,
      state: implementer.apply(record, state),
    };
  }

  project<TProjection = unknown>(
    record: IInterventionLedgerRecord,
    visibility: InterventionProjectionVisibility,
  ): TProjection {
    const implementer = this.implementers.get(record.domain);
    if (visibility === 'public') {
      return (
        implementer ? implementer.projectPublic(record) : record.publicEffect
      ) as TProjection;
    }

    return (
      implementer ? implementer.projectPrivate(record) : record.privateMetadata
    ) as TProjection;
  }

  getRecords(): readonly IInterventionLedgerRecord[] {
    return [...this.records];
  }

  private unsupportedReason(domain: InterventionDomain): string {
    const { unsupportedReason = defaultUnsupportedReason } = this.options;
    return unsupportedReason(domain);
  }
}

function freezeInterventionRecord(
  record: IInterventionLedgerRecord,
): IInterventionLedgerRecord {
  return Object.freeze({
    ...record,
    targetRefs: freezeRefs(record.targetRefs),
    causedBy: freezeOptionalRefs(record.causedBy),
    supersedes: freezeOptionalRefs(record.supersedes),
    subjectIds: freezeOptionalRefs(record.subjectIds),
  });
}

function freezeRefs(refs: readonly string[]): readonly string[] {
  return Object.freeze([...refs]);
}

function freezeOptionalRefs(
  refs?: readonly string[],
): readonly string[] | undefined {
  return refs ? freezeRefs(refs) : undefined;
}
