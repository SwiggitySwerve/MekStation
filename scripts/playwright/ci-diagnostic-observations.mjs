// Scratch diagnostic only: event-driven host observations, never a sampler.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function observeHost({
  procRoot = '/proc',
  cgroupRoot = '/sys/fs/cgroup',
  shmPath = '/dev/shm',
} = {}) {
  const unavailable = [];
  const read = (file) => {
    try {
      return fs.readFileSync(file, 'utf8').trim();
    } catch (error) {
      unavailable.push({ file, code: error.code });
      return null;
    }
  };
  const kilobytes = (text) =>
    text === null
      ? null
      : Object.fromEntries(
          [...text.matchAll(/^([\w()]+):\s+(\d+)\s+kB$/gm)].map(
            ([, key, value]) => [key, Number(value) * 1024],
          ),
        );
  const memory = kilobytes(read(path.join(procRoot, 'meminfo')));
  let entries = [];
  try {
    entries = fs.readdirSync(procRoot).filter((name) => /^\d+$/.test(name));
  } catch (error) {
    unavailable.push({ file: procRoot, code: error.code });
  }
  const processes = [];
  for (const pid of entries) {
    const status = read(path.join(procRoot, pid, 'status'));
    if (status === null) continue;
    const name = /^Name:\s+(.+)$/m.exec(status)?.[1] ?? '';
    if (!/node|chrome|chromium|next-server|npm|MainThread/i.test(name))
      continue;
    const values = kilobytes(status);
    const command =
      read(path.join(procRoot, pid, 'cmdline'))
        ?.replaceAll('\0', ' ')
        .trim() ?? null;
    processes.push({
      pid: Number(pid),
      ppid: Number(/^PPid:\s+(\d+)/m.exec(status)?.[1]),
      name,
      command,
      rssBytes: values.VmRSS ?? null,
      highWaterRssBytes: values.VmHWM ?? null,
    });
  }
  processes.sort((a, b) => a.pid - b.pid);
  let cgroup = null;
  const membership = read(path.join(procRoot, 'self/cgroup'));
  const relative = /^0::(.*)$/m.exec(membership ?? '')?.[1];
  if (relative !== undefined) {
    const root = path.resolve(cgroupRoot),
      directory = path.resolve(root, `.${relative}`);
    if (directory === root || directory.startsWith(root + path.sep)) {
      const values = Object.fromEntries(
        [
          'memory.current',
          'memory.peak',
          'memory.max',
          'memory.events',
          'memory.stat',
        ].map((name) => [name, read(path.join(directory, name))]),
      );
      cgroup = { version: 2, directory, values };
    } else
      unavailable.push({ file: membership, code: 'CGROUP_PATH_OUTSIDE_ROOT' });
  } else if (membership !== null)
    unavailable.push({ file: 'cgroup v2', code: 'UNSUPPORTED_MEMBERSHIP' });
  let shm = null;
  try {
    const stats = fs.statfsSync(shmPath);
    shm = {
      path: shmPath,
      totalBytes: stats.bsize * stats.blocks,
      freeBytes: stats.bsize * stats.bfree,
      availableBytes: stats.bsize * stats.bavail,
    };
  } catch (error) {
    unavailable.push({ file: shmPath, code: error.code });
  }
  return {
    platform: process.platform,
    node: process.version,
    cpus: os.availableParallelism(),
    memory,
    processes,
    cgroup,
    shm,
    unavailable,
    rssMeaning:
      'Per-process current RSS and lifetime VmHWM. Shared pages may be counted in multiple processes; neither is aggregate process-tree peak RSS.',
  };
}
