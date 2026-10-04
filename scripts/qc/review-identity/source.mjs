/** Pure adapters for frozen native JSONL records; no source locator leaves this module. */
import { isDeepStrictEqual } from 'node:util';

import { sha256 } from '../roadmap-loop-runtime.mjs';
import { identityOne as one } from './contract.mjs';
import {
  checkNativeActor,
  exactKeys,
  identityCheck,
  nativeCallId,
  nativePrefix,
  nativeJson,
  nativeUtf8,
  sessionId,
  spawnCallId,
} from './contract.mjs';

export function scanNativeRecords(bytes, prefixBytes = bytes.length) {
  identityCheck(
    Buffer.isBuffer(bytes) &&
      Number.isSafeInteger(prefixBytes) &&
      prefixBytes > 0 &&
      prefixBytes <= bytes.length &&
      bytes[prefixBytes - 1] === 10,
    'native prefix must contain complete LF records',
  );
  const records = [];
  for (let offset = 0; offset < prefixBytes; ) {
    const end = bytes.indexOf(10, offset) + 1;
    identityCheck(
      end > offset && end <= prefixBytes,
      'native incomplete required record',
    );
    const raw = bytes.subarray(offset, end);
    const value = nativeJson(raw);
    identityCheck(
      value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof value.type === 'string' &&
        value.payload &&
        typeof value.payload === 'object',
      'native malformed record',
    );
    records.push({
      ref: {
        ordinal: records.length,
        offset,
        bytes: raw.length,
        sha256: sha256(raw),
      },
      value,
    });
    offset = end;
  }
  return {
    records,
    prefixBytes,
    prefixSha256: sha256(bytes.subarray(0, prefixBytes)),
  };
}

const selectedPrefix = (scan, selected) => {
  const source = {
    prefixBytes: scan.prefixBytes,
    prefixSha256: scan.prefixSha256,
    records: [
      ...new Map(selected.map((r) => [r.ref.ordinal, r.ref])).values(),
    ].sort((a, b) => a.ordinal - b.ordinal),
  };
  nativePrefix(source);
  return source;
};

/** Append may preserve facts, but cannot replace or duplicate a selected binding. */
export function reopenNativeRecords(bytes, source) {
  nativePrefix(source);
  const frozen = scanNativeRecords(bytes, source.prefixBytes);
  identityCheck(
    frozen.prefixSha256 === source.prefixSha256,
    'native frozen prefix changed',
  );
  const selected = source.records.map((ref) => {
    const record = frozen.records[ref.ordinal];
    identityCheck(
      isDeepStrictEqual(record?.ref, ref),
      'native selected raw reference changed',
    );
    return record;
  });
  const current = scanNativeRecords(bytes, bytes.lastIndexOf(10) + 1);
  const turns = [
    ...new Set(
      selected
        .filter((r) => r.value.type === 'turn_context')
        .map((r) => r.value.payload.turn_id),
    ),
  ];
  identityCheck(
    isDeepStrictEqual(
      nativeActor(frozen, turns).native,
      nativeActor(current, turns).native,
    ),
    'native appended route binding changed',
  );
  identityCheck(
    selected.every((record) => {
      const payload = record.value.payload;
      const itemId =
        payload.type === 'item_completed' ? payload.item?.id : undefined;
      const callId =
        record.value.type === 'response_item' ? payload.call_id : undefined;
      if (!itemId && !callId) return true;
      return (
        current.records.filter(
          (r) =>
            r.value.type === record.value.type &&
            r.value.payload.type === payload.type &&
            (itemId
              ? r.value.payload.item?.id === itemId
              : r.value.payload.call_id === callId),
        ).length === 1
      );
    }),
    'native appended selected call duplicated',
  );
  return frozen;
}

export function nativeActor(scan, turnIds) {
  identityCheck(
    Array.isArray(turnIds) &&
      turnIds.length > 0 &&
      turnIds.every(sessionId) &&
      new Set(turnIds).size === turnIds.length,
    'native named turns invalid',
  );
  const metadata = one(
    scan.records.filter((r) => r.value.type === 'session_meta'),
    'native metadata ambiguous',
  );
  identityCheck(
    metadata.ref.ordinal === 0,
    'native metadata must begin source',
  );
  const meta = metadata.value.payload;
  const spawn = meta.source?.subagent?.thread_spawn;
  const child = meta.cli_version === '0.160.0';
  identityCheck(
    child
      ? meta.multi_agent_version === 'v2' &&
          spawn &&
          meta.parent_thread_id === spawn.parent_thread_id &&
          meta.agent_path === spawn.agent_path &&
          meta.agent_role === spawn.agent_role &&
          !Object.hasOwn(meta, 'session_type')
      : meta.cli_version === '0.159.0-alpha.12.1' &&
          meta.source === 'vscode' &&
          meta.thread_source === 'user' &&
          ![
            'multi_agent_version',
            'parent_thread_id',
            'agent_path',
            'agent_role',
            'session_type',
          ].some((k) => Object.hasOwn(meta, k)),
    'unknown native CLI/source adapter',
  );
  identityCheck(
    !Object.hasOwn(meta, 'session_id') ||
      meta.session_id === (child ? meta.parent_thread_id : meta.id),
    'native session identifiers disagree',
  );
  const contexts = scan.records.filter(
    (r) =>
      r.value.type === 'turn_context' &&
      turnIds.includes(r.value.payload.turn_id),
  );
  const actor = {
    adapterVersion: child
      ? 'codex-child-0.160.0-v2'
      : 'codex-root-0.159.0-alpha.12.1',
    sessionId: meta.id,
    modelProvider: meta.model_provider,
    originator: meta.originator,
    cliVersion: meta.cli_version,
    source: child ? 'thread_spawn' : meta.source,
    ...(child
      ? {
          parentSessionId: spawn.parent_thread_id,
          agentPath: spawn.agent_path,
          agentRole: spawn.agent_role,
          depth: spawn.depth,
          multiAgentVersion: meta.multi_agent_version,
        }
      : { threadSource: meta.thread_source }),
    turns: turnIds.map((turnId) => {
      const matches = contexts.filter(
        (r) => r.value.payload.turn_id === turnId,
      );
      identityCheck(matches.length > 0, 'native contributing context absent');
      const projection = (r) => ({
        turnId,
        model: r.value.payload.model,
        effort: r.value.payload.effort,
        ...(Object.hasOwn(r.value.payload, 'root_turn_id')
          ? { rootTurnId: r.value.payload.root_turn_id }
          : {}),
      });
      const turn = projection(matches[0]);
      identityCheck(
        matches.every((r) => isDeepStrictEqual(projection(r), turn)),
        'native same-turn context route changed',
      );
      return turn;
    }),
  };
  checkNativeActor(actor);
  const terminals = scan.records.filter(
    (r) =>
      r.value.type === 'event_msg' &&
      r.value.payload.type === 'task_complete' &&
      turnIds.includes(r.value.payload.turn_id),
  );
  identityCheck(
    new Set(terminals.map((r) => r.value.payload.turn_id)).size ===
      terminals.length,
    'native duplicate terminal IDs',
  );
  return {
    native: actor,
    contexts,
    terminals: terminals.map((r) => ({
      turnId: r.value.payload.turn_id,
      record: r.ref,
    })),
    selected: [metadata, ...contexts, ...terminals],
  };
}

function mcpResultText(result) {
  exactKeys(result, {
    content: (c) => Array.isArray(c) && c.length === 1,
    isError: false,
  });
  const content = result.content[0];
  exactKeys(content, { type: 'text', text: (v) => typeof v === 'string' });
  return content.text;
}

function mcpFrame(scan, actor, callId, server, tool, pluginId) {
  identityCheck(nativeCallId(callId), 'native completion ID invalid');
  const matches = scan.records.filter(
    (r) =>
      r.value.type === 'event_msg' &&
      r.value.payload.type === 'item_completed' &&
      r.value.payload.item?.type === 'McpToolCall' &&
      r.value.payload.item.id === callId,
  );
  const record = one(matches, 'native completion call absent/duplicated');
  const { item, thread_id, turn_id } = record.value.payload;
  identityCheck(
    thread_id === actor.sessionId &&
      actor.turns.some((t) => t.turnId === turn_id) &&
      item.server === server &&
      item.tool === tool &&
      item.status === 'completed' &&
      item.pluginId === pluginId,
    'native completion thread/turn/tool mismatch',
  );
  const prior = scan.records
    .filter(
      (r) =>
        r.ref.ordinal < record.ref.ordinal && r.value.type === 'turn_context',
    )
    .at(-1);
  identityCheck(
    prior?.value.payload.turn_id === turn_id,
    'native completion out of turn',
  );
  const text = mcpResultText(item.result);
  const resultBytes = nativeUtf8(text);
  return {
    record,
    item,
    thread_id,
    turn_id,
    resultBytes,
    result: nativeJson(text),
  };
}

export function nativeCompletion(scan, actor, callId) {
  const { record, item, thread_id, turn_id, resultBytes, result } = mcpFrame(
    scan,
    actor,
    callId,
    'git_bash',
    'run',
    'omo@sisyphuslabs',
  );
  identityCheck(
    typeof item.arguments?.workdir === 'string',
    'native readback workdir absent',
  );
  exactKeys(result, {
    exitCode: 0,
    stdout: (v) => typeof v === 'string',
    stderr: '',
    timedOut: false,
  });
  const stdout = nativeUtf8(result.stdout);
  return {
    record,
    stdout,
    completion: {
      threadId: thread_id,
      turnId: turn_id,
      id: callId,
      server: item.server,
      tool: item.tool,
      status: item.status,
      frameSha256: record.ref.sha256,
      resultSha256: sha256(resultBytes),
      stdoutSha256: sha256(stdout),
      stdoutBytes: stdout.length,
      workdir: item.arguments.workdir,
    },
  };
}

export function nativeSpawn(scan, actor, callId) {
  identityCheck(
    actor.parentSessionId && spawnCallId(callId),
    'native spawn selector invalid',
  );
  const call = one(
    scan.records.filter(
      (r) =>
        r.value.type === 'response_item' &&
        r.value.payload.type === 'function_call' &&
        r.value.payload.call_id === callId,
    ),
    'native spawn call absent/duplicated',
  );
  const result = one(
    scan.records.filter(
      (r) =>
        r.value.type === 'response_item' &&
        r.value.payload.type === 'function_call_output' &&
        r.value.payload.call_id === callId,
    ),
    'native spawn result absent/duplicated',
  );
  identityCheck(
    call.value.payload.name === 'spawn_agent' &&
      result.ref.ordinal > call.ref.ordinal,
    'native spawn name/order mismatch',
  );
  const args = nativeJson(call.value.payload.arguments);
  const output = nativeJson(result.value.payload.output);
  exactKeys(output, { task_name: actor.agentPath });
  identityCheck(
    args.fork_turns === 'none' &&
      args.agent_type === actor.agentRole &&
      `/root/${args.task_name}` === actor.agentPath,
    'native reviewer/contributor spawn provenance mismatch',
  );
  const parentTurns = actor.turns.map((t) => t.rootTurnId);
  const parent = nativeActor(scan, [...new Set(parentTurns)]);
  identityCheck(
    parent.native.sessionId === actor.parentSessionId,
    'native parent ID mismatch',
  );
  const context = scan.records
    .filter(
      (r) =>
        r.ref.ordinal < call.ref.ordinal && r.value.type === 'turn_context',
    )
    .at(-1);
  identityCheck(
    context && parentTurns.includes(context.value.payload.turn_id),
    'native spawn parent context missing',
  );
  return {
    parentSessionId: actor.parentSessionId,
    callId,
    agentPath: actor.agentPath,
    agentRole: actor.agentRole,
    forkTurns: 'none',
    ...(Object.hasOwn(args, 'model') ? { requestedModel: args.model } : {}),
    ...(Object.hasOwn(args, 'reasoning_effort')
      ? { requestedEffort: args.reasoning_effort }
      : {}),
    source: selectedPrefix(scan, [call, result, ...parent.selected]),
  };
}

export function sourceObservation(
  scan,
  { turnIds, callId, extraRecords = [], chunkCallIds },
) {
  const actor = nativeActor(scan, turnIds);
  const call = nativeCompletion(scan, actor.native, callId);
  if (chunkCallIds !== undefined)
    identityCheck(
      Array.isArray(chunkCallIds) &&
        chunkCallIds.length > 0 &&
        chunkCallIds.every(nativeCallId) &&
        new Set(chunkCallIds).size === chunkCallIds.length &&
        chunkCallIds.at(-1) === callId,
      'native chunk call set/anchor invalid',
    );
  const chunks = chunkCallIds?.map((id) =>
    nativeCompletion(scan, actor.native, id),
  );
  if (chunks)
    identityCheck(
      chunks.every(
        (chunk, index) =>
          !index ||
          chunk.record.ref.ordinal > chunks[index - 1].record.ref.ordinal,
      ),
      'native chunk completion order/anchor mismatch',
    );
  return {
    native: actor.native,
    source: selectedPrefix(scan, [
      ...actor.selected,
      call.record,
      ...(chunks?.map((c) => c.record) ?? []),
      ...extraRecords,
    ]),
    terminals: actor.terminals,
    completion: call.completion,
    ...(chunks ? { chunks: chunks.map((c) => c.completion) } : {}),
    stdout: chunks ? chunks.map((c) => c.stdout) : call.stdout,
  };
}

/** A later parent interaction links the actor without replacing its fork-none birth. */
export function nativeParentLink(scan, actor, callId) {
  identityCheck(
    actor.parentSessionId && spawnCallId(callId),
    'native parent link selector invalid',
  );
  const call = one(
    scan.records.filter(
      (r) =>
        r.value.type === 'response_item' &&
        r.value.payload.type === 'function_call' &&
        r.value.payload.call_id === callId,
    ),
    'native parent link call absent/duplicated',
  );
  const result = one(
    scan.records.filter(
      (r) =>
        r.value.type === 'response_item' &&
        r.value.payload.type === 'function_call_output' &&
        r.value.payload.call_id === callId,
    ),
    'native parent link result absent/duplicated',
  );
  const args = nativeJson(call.value.payload.arguments);
  exactKeys(args, {
    target: actor.agentPath.slice('/root/'.length),
    message: (v) => typeof v === 'string',
  });
  identityCheck(
    call.value.payload.name === 'followup_task' &&
      result.value.payload.output === '' &&
      result.ref.ordinal > call.ref.ordinal,
    'native parent link operation/result mismatch',
  );
  const context = scan.records
    .filter(
      (r) =>
        r.ref.ordinal < call.ref.ordinal && r.value.type === 'turn_context',
    )
    .at(-1);
  identityCheck(context, 'native parent link context absent');
  const parent = nativeActor(scan, [context.value.payload.turn_id]);
  identityCheck(
    parent.native.sessionId === actor.parentSessionId &&
      parent.native.adapterVersion === 'codex-root-0.159.0-alpha.12.1',
    'native parent link identity mismatch',
  );
  return {
    operation: 'followup_task',
    parentSessionId: actor.parentSessionId,
    callId,
    agentPath: actor.agentPath,
    source: selectedPrefix(scan, [call, result, ...parent.selected]),
  };
}

const isMcpResult = (value) =>
  value !== null &&
  typeof value === 'object' &&
  (Object.hasOwn(value, 'content') || Object.hasOwn(value, 'isError'));

export function nativeApiPage(scan, observer, callId) {
  const frame = mcpFrame(
    scan,
    observer,
    callId,
    'codex_app',
    'read_thread',
    'codex-app-tools@openai-bundled',
  );
  if (!isMcpResult(frame.result)) return frame;
  const result = nativeJson(mcpResultText(frame.result));
  identityCheck(!isMcpResult(result), 'recursive API transport envelope');
  return { ...frame, result };
}

export { decodeReadback, encodeReadbackChunk } from './contract.mjs';
