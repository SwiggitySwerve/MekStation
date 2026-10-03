/** Identity schema facts. Canonical rules: openspec/planning/2026-09-12-roadmap-completion/WORKERS.md. */
import { isDeepStrictEqual } from 'node:util';

import { refuse } from '../roadmap-loop-runtime.mjs';

export const identityCheck = (condition, message) => {
  if (!condition) refuse('REVIEW_IDENTITY_INVALID', message);
};
export const exactKeys = (value, fields) => {
  identityCheck(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      isDeepStrictEqual(
        Object.keys(value).sort(),
        Object.keys(fields).sort(),
      ) &&
      Object.entries(fields).every(([key, rule]) =>
        typeof rule === 'function' ? rule(value[key]) : value[key] === rule,
      ),
    `invalid identity fields: ${Object.keys(fields).join(', ')}`,
  );
  return true;
};
export const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const TASK = /^st_[0-9a-f]{8}$/;
const SESSION =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const taskId = (v) => nonempty(v) && TASK.test(v);
export const sessionId = (v) => nonempty(v) && SESSION.test(v);

// Keep the old nonempty SHA predicate exact; native strictness is a separate schema.
export const checkRef = (ref) =>
  exactKeys(ref, {
    path: nonempty,
    sha256: nonempty,
    bytes: (v) => Number.isSafeInteger(v) && v > 0,
  });
export const observedEngine = (record) => ({
  task_id: record.task_id,
  child_session_id: record.child_session_id,
  model: record.model,
  execution_mode: record.execution_mode,
  agent_type: record.agent_type ?? null,
  resolved_model: {
    provider: record.resolved_model?.provider,
    model_id: record.resolved_model?.model_id,
  },
});
export const checkEngine = (engine) =>
  exactKeys(engine, {
    task_id: taskId,
    child_session_id: sessionId,
    model: `${engine?.resolved_model?.provider}/${engine?.resolved_model?.model_id}`,
    execution_mode: nonempty,
    agent_type: (v) => v === null || nonempty(v),
    resolved_model: (r) =>
      exactKeys(r, { provider: nonempty, model_id: nonempty }),
  });
