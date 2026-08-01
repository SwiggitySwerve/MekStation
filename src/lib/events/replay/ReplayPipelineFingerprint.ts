import { sha256 as sha256Pure } from 'js-sha256';

import { canonicalizeJsonV1 } from '../journal/EventJournalCanonicalizer';

export interface IHistoricalEventVersion {
  readonly eventType: string;
  readonly schemaVersion: number;
}

interface IReplayPipelinePath {
  readonly event: {
    readonly targetSchemaVersion: number;
    readonly schemas: ReadonlyMap<number, { readonly schemaId: string }>;
  };
  readonly transitions: readonly {
    readonly fromVersion: number;
    readonly toVersion: number;
    readonly transitionId: string;
  }[];
}

type ReplayPipelineResolver = (
  historicalVersion: IHistoricalEventVersion,
) => IReplayPipelinePath;

type RegistrationFailure = (
  code: 'invalid-registration',
  text: string,
) => never;

type TargetSchemaIdentity = Readonly<{
  eventType: string;
  schemaVersion: number;
  schemaId: string;
}>;

type TransitionIdentity = Readonly<{
  eventType: string;
  fromVersion: number;
  toVersion: number;
  transitionId: string;
}>;

export function fingerprintReplayPipeline(
  historicalVersions: readonly IHistoricalEventVersion[],
  resolve: ReplayPipelineResolver,
  registrationFailure: RegistrationFailure,
): string {
  const versionsByEvent = new Map<string, Set<number>>();
  for (const historicalVersion of historicalVersions) {
    const versions = versionsByEvent.get(historicalVersion.eventType);
    if (versions) versions.add(historicalVersion.schemaVersion);
    else
      versionsByEvent.set(
        historicalVersion.eventType,
        new Set([historicalVersion.schemaVersion]),
      );
  }

  const targets = new Map<string, TargetSchemaIdentity>();
  const transitions = new Map<string, Map<number, TransitionIdentity>>();
  const orderedRequests = Array.from(versionsByEvent.entries()).sort(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  );
  for (const [eventType, versions] of orderedRequests) {
    for (const schemaVersion of Array.from(versions).sort(
      (left, right) => left - right,
    )) {
      const resolved = resolve({ eventType, schemaVersion });
      const targetSchema = resolved.event.schemas.get(
        resolved.event.targetSchemaVersion,
      );
      if (!targetSchema)
        registrationFailure('invalid-registration', 'Missing target schema');
      targets.set(eventType, {
        eventType,
        schemaVersion: resolved.event.targetSchemaVersion,
        schemaId: targetSchema.schemaId,
      });
      let transitionsByVersion = transitions.get(eventType);
      if (!transitionsByVersion) {
        transitionsByVersion = new Map<number, TransitionIdentity>();
        transitions.set(eventType, transitionsByVersion);
      }
      for (const transition of resolved.transitions) {
        transitionsByVersion.set(transition.fromVersion, {
          eventType,
          fromVersion: transition.fromVersion,
          toVersion: transition.toVersion,
          transitionId: transition.transitionId,
        });
      }
    }
  }

  const material = {
    fingerprintVersion: 1,
    targetSchemas: Array.from(targets.values()).sort((left, right) =>
      left.eventType < right.eventType
        ? -1
        : left.eventType > right.eventType
          ? 1
          : 0,
    ),
    transitions: Array.from(transitions.values())
      .flatMap((byVersion) => Array.from(byVersion.values()))
      .sort((left, right) =>
        left.eventType < right.eventType
          ? -1
          : left.eventType > right.eventType
            ? 1
            : left.fromVersion - right.fromVersion,
      ),
  };
  const bytes = new TextEncoder().encode(canonicalizeJsonV1(material));
  return sha256Pure(bytes);
}
