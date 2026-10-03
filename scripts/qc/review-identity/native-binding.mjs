/** Native identity policy over plain values; LOCAL observer authority is external. */
import { isDeepStrictEqual } from 'node:util';

import { HEX40, UNIT_ID } from '../roadmap-loop-runtime.mjs';
import { identityOne as one } from './contract.mjs';
import {
  agentPath,
  checkNativeActor,
  checkReadbacks,
  exactKeys,
  identityCheck,
  nativeCallId,
  nativeCensusActor,
  nativeEffort,
  nativeHash,
  nativePrefix,
  nativeRecord,
  nativeRows,
  nonempty,
  originalWitness,
  sessionId,
  spawnCallId,
} from './contract.mjs';
import { nativeApiPage } from './source.mjs';

const completion = (value) =>
  exactKeys(value, {
    threadId: sessionId,
    turnId: sessionId,
    id: nativeCallId,
    server: 'git_bash',
    tool: 'run',
    status: 'completed',
    frameSha256: nativeHash,
    resultSha256: nativeHash,
    stdoutSha256: nativeHash,
    stdoutBytes: (n) => Number.isSafeInteger(n) && n > 0,
    workdir: nonempty,
  });
const completedSourceCall = (value) => {
  const group = value.chunks ?? [value.completion];
  if (value.chunks) {
    const refs = group.map((call) =>
      value.source.records.filter((ref) => ref.sha256 === call.frameSha256),
    );
    identityCheck(
      refs.every(
        (matches, index) =>
          matches.length === 1 &&
          (!index || matches[0].ordinal > refs[index - 1][0].ordinal),
      ),
      'native chunk raw refs ambiguous/out of order',
    );
  }
  identityCheck(
    group.every(
      (call) =>
        call.threadId === value.native.sessionId &&
        value.native.turns.some((t) => t.turnId === call.turnId) &&
        value.source.records.some((r) => r.sha256 === call.frameSha256) &&
        call.workdir === value.completion.workdir,
    ) &&
      new Set(group.map((call) => call.id)).size === group.length &&
      isDeepStrictEqual(group.at(-1), value.completion),
    'native source/call binding missing',
  );
};
const census = (actors) => {
  identityCheck(
    nativeRows(actors, nativeCensusActor) &&
      actors.length > 0 &&
      actors.filter((a) => a.role === 'author').length === 1 &&
      new Set(actors.map((a) => a.sessionId)).size === actors.length &&
      new Set(actors.filter((a) => a.agentPath).map((a) => a.agentPath))
        .size === actors.filter((a) => a.agentPath).length,
    'native complete contributor census invalid',
  );
  return true;
};
export const nativeImplementationCensus = census;
const parentActivity = (value, actor, kind) =>
  exactKeys(value, {
    kind,
    callId: spawnCallId,
    sessionId: actor.sessionId,
    parentSessionId: actor.parentSessionId,
    agentPath: actor.agentPath,
  });

export function validateNativeObservation(snapshot, terminal = true) {
  exactKeys(snapshot, {
    schemaVersion: 1,
    reviewContractVersion: 3,
    unit: (v) => nonempty(v) && UNIT_ID.test(v),
    sourceHead: (v) => typeof v === 'string' && HEX40.test(v),
    reviewOutputSha256: nativeHash,
    observedAt: (v) => nonempty(v) && Number.isFinite(Date.parse(v)),
    appWitness: (v) => Boolean(originalWitness(v)),
    routeWitness: (v) => Boolean(originalWitness(v)),
  });
  const route = originalWitness(snapshot.routeWitness);
  const app = originalWitness(snapshot.appWitness);
  exactKeys(route, {
    schemaVersion: 1,
    observer: (value) =>
      exactKeys(value, {
        native: checkNativeActor,
        source: nativePrefix,
        completion,
        ...(Object.hasOwn(value, 'chunks')
          ? { chunks: (v) => nativeRows(v, completion) && v.length > 0 }
          : {}),
        readbacks: (r) => checkReadbacks(r, ['review', 'local']),
        census,
      }),
    observation: (value) =>
      exactKeys(value, {
        role: (v) => ['author', 'finisher', 'reviewer'].includes(v),
        native: checkNativeActor,
        source: nativePrefix,
        terminals: (v) =>
          nativeRows(v, (r) =>
            exactKeys(r, { turnId: sessionId, record: nativeRecord }),
          ),
        completion,
        ...(Object.hasOwn(value, 'chunks')
          ? { chunks: (v) => nativeRows(v, completion) && v.length > 0 }
          : {}),
        readbacks: (r) =>
          checkReadbacks(r, value.role === 'reviewer' ? ['review'] : []),
        ...(Object.hasOwn(value, 'parentLink')
          ? {
              parentLink: (v) =>
                exactKeys(v, {
                  operation: 'followup_task',
                  parentSessionId: sessionId,
                  callId: spawnCallId,
                  agentPath,
                  source: nativePrefix,
                }),
            }
          : {}),
        ...(Object.hasOwn(value, 'spawn')
          ? {
              spawn: (s) =>
                exactKeys(s, {
                  parentSessionId: sessionId,
                  callId: spawnCallId,
                  agentPath,
                  agentRole: nonempty,
                  forkTurns: 'none',
                  source: nativePrefix,
                  ...(Object.hasOwn(s, 'requestedModel')
                    ? { requestedModel: 'gpt-6.1-sol' }
                    : {}),
                  ...(Object.hasOwn(s, 'requestedEffort')
                    ? { requestedEffort: nativeEffort }
                    : {}),
                }),
            }
          : {}),
      }),
  });
  const { observer, observation } = route;
  const { native: actor, completion: call } = observation;
  identityCheck(
    observer.native.adapterVersion === 'codex-root-0.159.0-alpha.12.1' &&
      observer.native.sessionId !== actor.sessionId,
    'native observer must be separately observed LOCAL root',
  );
  completedSourceCall(observer);
  completedSourceCall(observation);
  exactKeys(app, {
    schemaVersion: 1,
    observer: (v) =>
      exactKeys(v, {
        sessionId: observer.native.sessionId,
        callIds: (ids) =>
          nativeRows(ids, nativeCallId) &&
          ids.length > 0 &&
          new Set(ids).size === ids.length,
      }),
    sessionId: actor.sessionId,
    kind: 'codex',
    hostId: 'local',
    threadStatus: (v) => ['active', 'idle', 'notLoaded'].includes(v),
    turns: (v) =>
      nativeRows(v, (turn) =>
        exactKeys(turn, {
          turnId: sessionId,
          status: (s) => ['completed', 'inProgress'].includes(s),
          calls: (calls) =>
            nativeRows(calls, (c) =>
              exactKeys(c, {
                id: nativeCallId,
                server: 'git_bash',
                tool: 'run',
                status: 'completed',
                workdir: nonempty,
              }),
            ),
        }),
      ),
    ...(Object.hasOwn(app, 'spawn')
      ? {
          spawn: (v) => parentActivity(v, actor, 'started'),
        }
      : {}),
    ...(Object.hasOwn(app, 'parentLink')
      ? {
          parentLink: (v) => parentActivity(v, actor, 'interacted'),
        }
      : {}),
  });
  identityCheck(
    isDeepStrictEqual(
      app.turns.map((t) => t.turnId),
      actor.turns.map((t) => t.turnId),
    ),
    'App complete named turn coverage missing',
  );
  const calls = app.turns.flatMap((t) =>
    t.calls.map((c) => ({ ...c, turnId: t.turnId })),
  );
  identityCheck(
    calls.length === (observation.chunks ?? [call]).length &&
      (observation.chunks ?? [call]).every(
        (expected) =>
          calls.filter(
            (c) =>
              c.id === expected.id &&
              c.turnId === expected.turnId &&
              c.workdir === expected.workdir,
          ).length === 1,
      ) &&
      observer.completion.workdir === call.workdir,
    'native App completed call/workdir mismatch',
  );
  identityCheck(
    Boolean(actor.parentSessionId) === Boolean(observation.spawn) &&
      Boolean(actor.parentSessionId) === Boolean(app.spawn || app.parentLink) &&
      !(app.spawn && app.parentLink) &&
      Boolean(observation.parentLink) === Boolean(app.parentLink) &&
      (!observation.spawn ||
        (observation.spawn.parentSessionId === actor.parentSessionId &&
          observation.spawn.agentPath === actor.agentPath &&
          observation.spawn.agentRole === actor.agentRole &&
          (app.spawn
            ? observation.spawn.callId === app.spawn.callId
            : observation.parentLink.parentSessionId ===
                actor.parentSessionId &&
              observation.parentLink.agentPath === actor.agentPath &&
              observation.parentLink.callId === app.parentLink.callId &&
              observation.parentLink.callId !== observation.spawn.callId))),
    'native parent/spawn isolation mapping missing',
  );
  const shared = [
    'privateRoots',
    'head',
    'tree',
    'index',
    'inventory',
    'diff',
    'status',
    'files',
  ];
  identityCheck(
    shared.every((k) =>
      isDeepStrictEqual(observation.readbacks[k], observer.readbacks[k]),
    ) &&
      observer.readbacks.head === snapshot.sourceHead &&
      observer.readbacks.review.sha256 === snapshot.reviewOutputSha256 &&
      (observation.role !== 'reviewer' ||
        isDeepStrictEqual(
          observation.readbacks.review,
          observer.readbacks.review,
        )),
    'native causal source/output readback mismatch',
  );
  const participant = observer.census.find(
    (a) => a.sessionId === actor.sessionId,
  );
  if (observation.role === 'reviewer')
    identityCheck(
      !participant &&
        observer.census.every(
          (a) => !a.agentPath || a.agentPath !== actor.agentPath,
        ),
      'native reviewer shares contributor identity',
    );
  else
    identityCheck(
      participant?.role === observation.role &&
        participant.model ===
          `${actor.modelProvider}/${actor.turns[0].model}` &&
        participant.agentPath === actor.agentPath,
      'native actor omitted/changed in full census',
    );
  if (terminal)
    identityCheck(
      app.turns.every((t) => t.status === 'completed') &&
        isDeepStrictEqual(
          observation.terminals.map((t) => t.turnId).sort(),
          actor.turns.map((t) => t.turnId).sort(),
        ) &&
        new Set(observation.terminals.map((t) => t.turnId)).size ===
          observation.terminals.length &&
        observation.terminals.every((t) =>
          observation.source.records.some((r) =>
            isDeepStrictEqual(r, t.record),
          ),
        ),
      'native final contributor/reviewer turn incomplete',
    );
  return { observation, app, observer };
}

export function validateNativeReview({
  snapshots,
  manifest,
  actors,
  review,
  localSha256,
}) {
  const bindings = snapshots.map((s) => validateNativeObservation(s.value));
  census(actors);
  const contributors = [
    actors.find((a) => a.role === 'author'),
    ...actors.filter((a) => a.role === 'finisher'),
  ];
  const reviewer = bindings.at(-1);
  identityCheck(
    bindings.length === contributors.length + 1 &&
      bindings
        .slice(0, -1)
        .every(
          (b, i) =>
            b.observation.role === contributors[i].role &&
            b.observation.native.sessionId === contributors[i].sessionId &&
            b.observation.native.agentPath === contributors[i].agentPath,
        ) &&
      reviewer.observation.role === 'reviewer',
    'native manifest must cover author/ALL real finishers and independent reviewer',
  );
  identityCheck(
    bindings.every(
      (b) =>
        isDeepStrictEqual(b.observer, bindings[0].observer) &&
        isDeepStrictEqual(b.observer.census, actors) &&
        b.observer.readbacks.local.sha256 === localSha256,
    ),
    'native independent final observer/census/local mismatch',
  );
  identityCheck(
    snapshots.every(
      (s) =>
        s.value.unit === manifest.unit &&
        s.value.sourceHead === manifest.sourceHead &&
        s.value.reviewOutputSha256 === manifest.reviewOutputSha256,
    ),
    'native snapshot manifest bindings mismatch',
  );
  const model = (b) =>
    `${b.observation.native.modelProvider}/${b.observation.native.turns[0].model}`;
  identityCheck(
    review.implementerModel === model(bindings[0]) &&
      review.reviewerModel === model(reviewer) &&
      (!Object.hasOwn(review, 'finisherModel') ||
        (contributors.length === 2 &&
          review.finisherModel === model(bindings[1]))),
    'native review model/census mismatch',
  );
  return bindings;
}

/** Reconstruct safe App projections from the observer's genuine retained API calls. */
export function nativeAppObservation(
  scan,
  observer,
  {
    subject,
    callId,
    appCallIds,
    parentAppCallIds = [],
    spawnCallId: spawnId,
    parentLinkCallId,
    chunkCallIds,
  },
) {
  const selected = [];
  const pages = (ids, targetId) => {
    identityCheck(
      Array.isArray(ids) &&
        ids.length > 0 &&
        ids.every(nativeCallId) &&
        new Set(ids).size === ids.length,
      'App observation call list invalid',
    );
    let cursor;
    const turns = [];
    let thread;
    for (const id of ids) {
      const frame = nativeApiPage(scan, observer, id);
      const { result, item, record } = frame;
      identityCheck(
        item.arguments.threadId === targetId &&
          (cursor === undefined
            ? !Object.hasOwn(item.arguments, 'cursor')
            : item.arguments.cursor === cursor) &&
          result.schemaVersion === 1 &&
          result.thread?.id === targetId &&
          result.thread.kind === 'codex' &&
          result.thread.hostId === 'local' &&
          Array.isArray(result.turns),
        'App thread/pagination/adapter mismatch',
      );
      exactKeys(result.page, {
        order: 'newest_first',
        limit: (n) => Number.isInteger(n) && n > 0,
        nextCursor: (v) => v === null || typeof v === 'string',
        hasMore: (v) => typeof v === 'boolean',
      });
      identityCheck(
        result.page.hasMore === (result.page.nextCursor !== null) &&
          (!thread || thread.id === result.thread.id),
        'App pagination inconsistent',
      );
      thread = result.thread;
      turns.push(...result.turns);
      selected.push(record);
      cursor = result.page.nextCursor;
    }
    identityCheck(
      new Set(turns.map((t) => t.id)).size === turns.length,
      'App duplicated turn coverage',
    );
    return { thread, turns };
  };
  const observed = pages(appCallIds, subject.sessionId);
  const turns = subject.turns.map((turn) => {
    const actual = one(
      observed.turns.filter((t) => t.id === turn.turnId),
      'App contributing turn absent/duplicated',
    );
    identityCheck(
      ['completed', 'inProgress'].includes(actual.status) &&
        Array.isArray(actual.items),
      'App unsupported turn shape',
    );
    const calls = actual.items
      .filter(
        (i) =>
          i.type === 'mcpToolCall' && (chunkCallIds ?? [callId]).includes(i.id),
      )
      .map((i) => {
        identityCheck(
          i.server === 'git_bash' &&
            i.tool === 'run' &&
            i.status === 'completed' &&
            typeof i.arguments?.workdir === 'string',
          'App named call incomplete',
        );
        return {
          id: i.id,
          server: i.server,
          tool: i.tool,
          status: i.status,
          workdir: i.arguments.workdir,
        };
      });
    return { turnId: actual.id, status: actual.status, calls };
  });
  let activity;
  if (subject.parentSessionId) {
    const parent = pages(parentAppCallIds, subject.parentSessionId);
    const item = one(
      parent.turns
        .flatMap((t) => t.items ?? [])
        .filter(
          (i) =>
            i.type === 'subAgentActivity' &&
            i.id === (parentLinkCallId ?? spawnId),
        ),
      'App actual spawn absent/duplicated',
    );
    identityCheck(
      item.kind === (parentLinkCallId ? 'interacted' : 'started') &&
        item.agentThreadId === subject.sessionId &&
        item.agentPath === subject.agentPath,
      'App spawn identity mismatch',
    );
    activity = {
      kind: item.kind,
      callId: item.id,
      sessionId: item.agentThreadId,
      parentSessionId: parent.thread.id,
      agentPath: item.agentPath,
    };
  } else
    identityCheck(
      parentAppCallIds.length === 0 &&
        spawnId === undefined &&
        parentLinkCallId === undefined,
      'root actor cannot have child App provenance',
    );
  return {
    app: {
      schemaVersion: 1,
      observer: {
        sessionId: observer.sessionId,
        callIds: [...appCallIds, ...parentAppCallIds],
      },
      sessionId: observed.thread.id,
      kind: observed.thread.kind,
      hostId: observed.thread.hostId,
      threadStatus: observed.thread.status.type,
      turns,
      ...(activity
        ? { [parentLinkCallId ? 'parentLink' : 'spawn']: activity }
        : {}),
    },
    selected,
  };
}
