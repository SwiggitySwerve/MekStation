import childProcess from 'node:child_process';
import { readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';

const input = JSON.parse(readFileSync(0, 'utf8'));
let calls = 0;
const commands = [];
if (input.outputs) {
  childProcess.execFileSync = (command, args) => {
    commands.push({ command, args });
    const output = input.outputs[Math.min(calls++, input.outputs.length - 1)];
    if (output.error)
      throw Object.assign(new Error(output.error), { code: 'ENOENT' });
    return (
      output.raw ??
      (process.platform === 'win32'
        ? JSON.stringify(output.rows)
        : 'PID PPID COMM ARGS\n' +
          output.rows
            .map(
              (row) =>
                `${row.ProcessId} ${row.ParentProcessId} ${row.Name} ${row.CommandLine ?? row.Name}`,
            )
            .join('\n'))
    );
  };
  syncBuiltinESMExports();
}
const moduleUrl = new URL('../qc/machine-idle.mjs', import.meta.url);
if (input.action === 'cli') {
  process.argv = [
    process.execPath,
    fileURLToPath(moduleUrl),
    ...(input.args ?? []),
  ];
}
const idle = await import(moduleUrl.href);
if (input.action !== 'cli') {
  const logs = [];
  try {
    const value =
      input.action === 'snapshot'
        ? idle.takeSnapshot()
        : input.action === 'wait'
          ? await idle.waitForIdle({
              ...input.options,
              log: (rows) => logs.push(rows),
            })
          : idle.listBuildProcesses(input.snapshot, input.options);
    console.log(JSON.stringify({ value, calls, commands, logs }));
  } catch (error) {
    console.log(
      JSON.stringify({
        error: { name: error.name, code: error.code, busy: error.busy },
        calls,
        commands,
        logs,
      }),
    );
  }
}
