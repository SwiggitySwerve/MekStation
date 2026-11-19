import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function assertJobResults(expected, gates, needs) {
  if (
    !Array.isArray(expected) ||
    !expected.length ||
    !needs ||
    JSON.stringify(Object.keys(needs).sort()) !==
      JSON.stringify([...expected].sort())
  )
    throw new Error('Missing or unknown job results');
  if (!gates || Object.keys(gates).some((id) => !expected.includes(id)))
    throw new Error('Unknown gated job');
  const outputs = needs['detect-changes']?.outputs;
  for (const id of expected) {
    const result = needs[id]?.result;
    if (result === 'success') continue;
    // A gated job's `if:` is the conjunction of these gates, so any one
    // 'false' explains the skip (a draft's `ready`, or a path gate).
    const gate = gates[id];
    if (
      result !== 'skipped' ||
      !Array.isArray(gate) ||
      !gate.length ||
      gate.some((name) => typeof name !== 'string') ||
      !gate.some((name) => outputs?.[name] === 'false')
    )
      throw new Error(`${id}=${result}: did not pass or prove a gate false`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const config = JSON.parse(
      fs.readFileSync('config/ci/budgets.json', 'utf8'),
    );
    const expected = Object.keys(config.timeouts).filter(
      (id) => id !== 'lint-and-test',
    );
    assertJobResults(
      expected,
      JSON.parse(process.env.GATES_JSON),
      JSON.parse(process.env.NEEDS_JSON),
    );
    console.log('Every fan-out job passed or proved its gate false');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
