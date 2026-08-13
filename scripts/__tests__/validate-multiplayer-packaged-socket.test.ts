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
});
