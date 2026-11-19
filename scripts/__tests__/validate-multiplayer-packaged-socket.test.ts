import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const script = path.resolve('scripts/validate-multiplayer-packaged-socket.mjs');
const serverSrc = path.resolve('server.js');
const SENTINEL = 'NEXT_IMPORT_SENTINEL';
const READY = 'MEKSTATION_LISTENER_READY';
// prettier-ignore
const REJECTS = ['', ' ', 'localhost', '127.0.0.2', '192.168.1.10', '0.0.0.0', '::', '::1', 'not-an-ip'];

function probe(root: string, preload: string, env: NodeJS.ProcessEnv) {
  // prettier-ignore
  return spawnSync(process.execPath, ['--require', preload, 'server.js'], { cwd: root, env, encoding: 'utf8', timeout: 5000 });
}

describe('CAMP-00 packaged listener', () => {
  it('rejects invalid ready records and split-parses a valid line', () => {
    expect(spawnSync(process.execPath, [script, '--self-test']).status).toBe(0);
  });

  it('preserves pre-created observation bytes on no-replace collision', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'camp00-obs-'));
    const finalPath = path.join(directory, 'listener-observation.json');
    fs.writeFileSync(finalPath, 'keep\n');
    const harness = `import { finalizeObservation } from ${JSON.stringify(pathToFileURL(script).href)};
const req=JSON.parse(process.argv[1]);
try { finalizeObservation(req.directory,req.observation); process.stdout.write('ok'); }
catch(e){ process.stdout.write(e instanceof Error?e.message:String(e)); process.exitCode=1; }`;
    // prettier-ignore
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', harness, JSON.stringify({ directory, observation: { schema: 'x' } })], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(finalPath, 'utf8')).toBe('keep\n');
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('rejects unsafe packaged hosts before Next and fails incomplete layout', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp00-srv-'));
    fs.writeFileSync(path.join(root, 'server.js'), fs.readFileSync(serverSrc));
    fs.writeFileSync(path.join(root, 'server.next-config.json'), '{}');
    fs.mkdirSync(path.join(root, '.next'));
    const preload = path.join(root, 'preload.cjs');
    // prettier-ignore
    fs.writeFileSync(preload, "const M=require('module');const o=M._load;M._load=function(r,...a){if(r==='next')throw new Error('NEXT_IMPORT_SENTINEL');return o.call(this,r,...a);};");
    for (const host of REJECTS) {
      const env = { ...process.env, HOSTNAME: host, PORT: '3750' };
      delete env.NODE_ENV;
      const result = probe(root, preload, env);
      const out = `${result.stdout}${result.stderr}`;
      expect(result.status).not.toBe(0);
      expect(out).not.toContain(SENTINEL);
      expect(out).not.toContain(READY);
    }
    fs.rmSync(path.join(root, 'server.next-config.json'));
    const omitted = { ...process.env, PORT: '3750' };
    delete omitted.HOSTNAME;
    delete omitted.NODE_ENV;
    const nonpackaged = probe(root, preload, omitted);
    expect(`${nonpackaged.stdout}${nonpackaged.stderr}`).toContain(SENTINEL);
    fs.writeFileSync(path.join(root, 'server.next-config.json'), '{}');
    fs.rmSync(path.join(root, '.next'), { recursive: true, force: true });
    const incomplete = probe(root, preload, omitted);
    expect(`${incomplete.stdout}${incomplete.stderr}`).not.toContain(SENTINEL);
    expect(incomplete.status).not.toBe(0);
    fs.rmSync(root, { recursive: true, force: true });
  });

  // PARITY-PLAN 1.0.92: the exact container opt-in is the only way past the
  // loopback rule, and only for HOSTNAME=0.0.0.0 in the packaged layout.
  it('binds all interfaces only with the exact container opt-in', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp00-ctr-'));
    fs.writeFileSync(path.join(root, 'server.js'), fs.readFileSync(serverSrc));
    fs.writeFileSync(path.join(root, 'server.next-config.json'), '{}');
    fs.mkdirSync(path.join(root, '.next'));
    const preload = path.join(root, 'preload.cjs');
    // prettier-ignore
    fs.writeFileSync(preload, "const M=require('module');const o=M._load;M._load=function(r,...a){if(r==='next')throw new Error('NEXT_IMPORT_SENTINEL');return o.call(this,r,...a);};");
    const run = (vars: Record<string, string>) => {
      const env: NodeJS.ProcessEnv = { ...process.env, PORT: '3750', ...vars };
      delete env.NODE_ENV;
      const result = probe(root, preload, env);
      return { status: result.status, out: `${result.stdout}${result.stderr}` };
    };
    const FLAG = 'MEKSTATION_CONTAINER_LISTEN';

    const opted = run({ HOSTNAME: '0.0.0.0', [FLAG]: 'all-interfaces' });
    expect(opted.out).toContain('CONTAINER_LISTEN_ALL_INTERFACES');
    expect(opted.out).toContain(SENTINEL);

    // prettier-ignore
    for (const value of ['', ' ', '1', 'true', 'yes', 'ALL-INTERFACES', 'all-interfaces ', ' all-interfaces', 'all']) {
      const wrong = run({ HOSTNAME: '0.0.0.0', [FLAG]: value });
      expect(wrong.status).not.toBe(0);
      expect(wrong.out).toContain(`${FLAG} ignored`);
      expect(wrong.out).not.toContain('CONTAINER_LISTEN_ALL_INTERFACES');
      expect(wrong.out).not.toContain(SENTINEL);
    }

    // The desktop shape: Electron passes 127.0.0.1, so an inherited flag is ignored.
    const desktop = run({ HOSTNAME: '127.0.0.1', [FLAG]: 'all-interfaces' });
    expect(desktop.out).toContain(`${FLAG} ignored`);
    expect(desktop.out).not.toContain('CONTAINER_LISTEN_ALL_INTERFACES');
    expect(desktop.out).toContain(SENTINEL);

    for (const host of REJECTS.filter((h) => h !== '0.0.0.0')) {
      const other = run({ HOSTNAME: host, [FLAG]: 'all-interfaces' });
      expect(other.status).not.toBe(0);
      expect(other.out).not.toContain(SENTINEL);
    }

    // Development (nonpackaged) keeps its rule: 0.0.0.0 is refused even with the flag.
    fs.rmSync(path.join(root, 'server.next-config.json'));
    const dev = run({ HOSTNAME: '0.0.0.0', [FLAG]: 'all-interfaces' });
    expect(dev.status).not.toBe(0);
    expect(dev.out).not.toContain(SENTINEL);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('keeps the container opt-in out of everything but the Dockerfile', () => {
    const FLAG = 'MEKSTATION_CONTAINER_LISTEN';
    const offenders: string[] = [];
    const skip = new Set([
      'node_modules',
      '.next',
      '.git',
      'public',
      'openspec',
    ]);
    const visit = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name)) continue;
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(file);
        else if (/\.(ts|tsx|js|mjs|cjs|json|ya?ml|sh)$/.test(entry.name))
          if (fs.readFileSync(file, 'utf8').includes(FLAG))
            offenders.push(path.relative(process.cwd(), file));
      }
    };
    for (const dir of ['desktop', 'src', 'scripts', '.github'])
      if (fs.existsSync(dir)) visit(dir);
    for (const file of [
      'package.json',
      'docker-compose.yml',
      'electron-builder.yml',
    ])
      if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(FLAG))
        offenders.push(file);
    // server.js reads it and this test names it; only the Dockerfile sets it.
    expect(offenders.map((f) => f.replace(/\\/g, '/'))).toEqual([
      'scripts/__tests__/validate-multiplayer-packaged-socket.test.ts',
    ]);
    expect(fs.readFileSync('Dockerfile', 'utf8')).toContain(
      `ENV ${FLAG}=all-interfaces`,
    );
  });

  // The same-host guard trusts a loopback Host header, so the container's port
  // must never be published beyond the host's loopback (PARITY-PLAN 1.0.92).
  it('publishes the container port on 127.0.0.1 only and adds no reverse proxy', () => {
    const composeFiles = fs
      .readdirSync('.')
      .filter((name) => /^(docker-)?compose[^/]*\.ya?ml$/.test(name));
    expect(composeFiles).toContain('docker-compose.yml');
    const unsafe: string[] = [];
    for (const file of composeFiles) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      let inPorts = false;
      for (const line of lines) {
        if (/^\s*ports:\s*$/.test(line)) {
          inPorts = true;
          continue;
        }
        const entry = /^\s*-\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line);
        if (inPorts && entry) {
          if (!entry[1].startsWith('127.0.0.1:'))
            unsafe.push(`${file}: ${entry[1]}`);
          continue;
        }
        if (!/^\s*#/.test(line)) inPorts = false;
        if (/traefik\.|caddy\.|nginx-proxy/i.test(line) && !/^\s*#/.test(line))
          unsafe.push(`${file}: reverse-proxy label ${line.trim()}`);
      }
    }
    const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      .scripts as Record<string, string>;
    for (const [name, command] of Object.entries(scripts)) {
      if (!/\bdocker\s+run\b/.test(command)) continue;
      for (const match of command.matchAll(
        /(?:^|\s)(?:-p|--publish)[\s=](\S+)/g,
      ))
        if (!match[1].startsWith('127.0.0.1:'))
          unsafe.push(`package.json ${name}: ${match[1]}`);
    }
    expect(unsafe).toEqual([]);
  });
});
