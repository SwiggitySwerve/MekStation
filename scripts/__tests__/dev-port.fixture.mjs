import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const input = JSON.parse(readFileSync(0, 'utf8'));
const listener = net.createServer((socket) => socket.end('alive'));
await new Promise((resolve) => listener.listen(0, resolve));
const port = listener.address().port;
const moduleUrl = new URL('../next/run-dev.mjs', import.meta.url);

if (input.busy) {
  const child = childProcess.spawn(
    process.execPath,
    [fileURLToPath(moduleUrl), ...(input.next ? ['--next'] : [])],
    {
      env: {
        PORT: String(port),
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let stderr = '';
  child.stderr.on('data', (data) => {
    stderr += data;
  });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', resolve);
  });
  const alive = await new Promise((resolve) => {
    const socket = net.connect(port, 'localhost');
    socket.on('error', () => resolve(false));
    socket.on('data', () => resolve(true));
  });
  await new Promise((resolve) => listener.close(resolve));
  console.log(JSON.stringify({ code, stderr, port, pid: process.pid, alive }));
} else {
  await new Promise((resolve) => listener.close(resolve));
  const calls = [];
  const kills = [];
  childProcess.spawn = (command, args, options) => {
    const child = new EventEmitter();
    calls.push({ command, args, port: options.env.PORT });
    child.kill = (signal) => {
      kills.push(signal);
      setImmediate(() => child.emit('exit', null, signal));
      return true;
    };
    setImmediate(() => {
      if (calls.length === 1) child.emit('exit', input.syncCode ?? 0, null);
      else if (input.signal) process.emit(input.signal);
      else child.emit('exit', input.serverCode ?? 0, null);
    });
    return child;
  };
  syncBuiltinESMExports();
  process.env.PORT = String(port);
  process.argv = [
    process.execPath,
    fileURLToPath(moduleUrl),
    ...(input.next ? ['--next'] : []),
  ];
  await import(moduleUrl.href);
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  console.log(JSON.stringify({ code, calls, kills, port }));
}
