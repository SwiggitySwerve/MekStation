#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { createHash, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PLAYER_ID_PREFIX = 'pid_';
const PLAYER_ID_BYTES = 20;

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const defaultPort = 3700 + (process.pid % 1000);
const port = Number.parseInt(process.env.PORT ?? String(defaultPort), 10);
const host =
  process.env.HOSTNAME && process.env.HOSTNAME !== '0.0.0.0'
    ? process.env.HOSTNAME
    : '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const repoRoot = path.resolve(
  getArg('repo-root') ?? process.env.MEKSTATION_REPO_ROOT ?? process.cwd(),
);
const standaloneDirArg =
  getArg('standalone-dir') ?? process.env.MEKSTATION_STANDALONE_DIR ?? null;
const standaloneDir = standaloneDirArg
  ? path.resolve(standaloneDirArg)
  : path.join(repoRoot, '.next', 'standalone');
const electronNodeExe =
  getArg('electron-node-exe') ?? process.env.MEKSTATION_ELECTRON_NODE_EXE ?? '';
const startMode = standaloneDirArg
  ? electronNodeExe
    ? 'electron-node-standalone'
    : 'node-standalone'
  : 'npm-run-start';
const dbPath =
  process.env.MULTIPLAYER_DB_PATH ??
  path.join(os.tmpdir(), `mekstation-mp-packaged-${process.pid}.db`);

function bytesToBase58(bytes) {
  if (bytes.length === 0) return '';
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros += 1;
  }
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  const out = [];
  while (value > 0n) {
    out.push(BASE58_ALPHABET[Number(value % 58n)]);
    value /= 58n;
  }
  for (let i = 0; i < leadingZeros; i += 1) out.push(BASE58_ALPHABET[0]);
  return out.reverse().join('');
}

function derivePlayerId(publicKeyBytes) {
  return (
    PLAYER_ID_PREFIX + bytesToBase58(publicKeyBytes.slice(0, PLAYER_ID_BYTES))
  );
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function canonicalPayload({ playerId, issuedAt, expiresAt }) {
  return JSON.stringify({ expiresAt, issuedAt, playerId });
}

async function issueWireToken() {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  );
  const publicKeyBytes = new Uint8Array(
    await webcrypto.subtle.exportKey('raw', keyPair.publicKey),
  );
  const playerId = derivePlayerId(publicKeyBytes);
  const nowMs = Date.now();
  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + 60 * 60 * 1000).toISOString();
  const signatureBytes = new Uint8Array(
    await webcrypto.subtle.sign(
      'Ed25519',
      keyPair.privateKey,
      new TextEncoder().encode(
        canonicalPayload({ playerId, issuedAt, expiresAt }),
      ),
    ),
  );
  const token = {
    playerId,
    issuedAt,
    expiresAt,
    publicKey: toBase64(publicKeyBytes),
    signature: toBase64(signatureBytes),
  };
  return {
    playerId,
    wireToken: Buffer.from(JSON.stringify(token), 'utf8').toString('base64'),
  };
}

function assertHydratedStandaloneServer() {
  const serverPath = path.join(standaloneDir, 'server.js');
  const configPath = path.join(standaloneDir, 'server.next-config.json');
  const tsxPath = path.join(standaloneDir, 'node_modules', 'tsx');
  const wsPath = path.join(standaloneDir, 'node_modules', 'ws');
  const sourcePath = path.join(
    standaloneDir,
    'src',
    'lib',
    'multiplayer',
    'server',
    'bindMultiplayerSocketConnection.ts',
  );
  const battleMechCatalogPath = path.join(
    standaloneDir,
    'public',
    'data',
    'units',
    'battlemechs',
    'index.json',
  );

  for (const filePath of [
    serverPath,
    configPath,
    tsxPath,
    wsPath,
    sourcePath,
    battleMechCatalogPath,
  ]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Packaged multiplayer server is not hydrated; missing ${path.relative(
          repoRoot,
          filePath,
        )}. Run npm run build first or package the Electron app before validating unpacked resources.`,
      );
    }
  }

  const server = fs.readFileSync(serverPath, 'utf8');
  if (
    !server.includes('/api/multiplayer/socket') ||
    !server.includes("server.on('upgrade'") ||
    !server.includes('bindMultiplayerSocketConnection')
  ) {
    throw new Error(
      'Packaged server exists but does not contain multiplayer upgrade wiring.',
    );
  }
}

function captureServerOutput(child, label) {
  let output = '';
  const onData = (chunk) => {
    output += chunk.toString();
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code, signal) => {
    output += `\n[validate] ${label} exited code=${code} signal=${signal}\n`;
  });
  return () => output;
}

async function waitForServer(child, getOutput) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out waiting for packaged server readiness. Output:\n${getOutput()}`,
        ),
      );
    }, 60_000);

    const onData = (chunk) => {
      const output = getOutput() + chunk.toString();
      if (output.includes('Ready on')) {
        clearTimeout(timeout);
        resolve(output);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `npm run start exited before readiness (code ${code}). Output:\n${getOutput()}`,
        ),
      );
    });
  });
}

async function createMatch(wireToken, playerId, getOutput, origin = baseUrl) {
  let response;
  try {
    response = await fetch(`${origin}/api/multiplayer/matches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${wireToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        config: { mapRadius: 4, turnLimit: 5 },
        displayName: 'Packaged Socket Smoke Host',
        playerIds: [playerId],
        layout: '1v1',
      }),
    });
  } catch (error) {
    throw new Error(
      `Match create request failed: ${
        error instanceof Error ? error.message : String(error)
      }\nServer output:\n${getOutput()}`,
    );
  }
  const responseText = await response.text();
  let body;
  try {
    body = JSON.parse(responseText);
  } catch (error) {
    throw new Error(
      `Match create returned malformed JSON (${response.status}): ${responseText.slice(
        0,
        500,
      )}\nServer output:\n${getOutput()}`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `Match create failed (${response.status}): ${JSON.stringify(body)}`,
    );
  }
  return body;
}

async function openAndJoin(wsUrl, wireToken, playerId, matchId, getOutput) {
  const url = `${wsUrl}&token=${encodeURIComponent(wireToken)}`;
  const messages = [];
  const clientTrace = [];
  const ws = new WebSocket(url, { perMessageDeflate: false });
  ws.once('open', () => {
    if (ws._socket) {
      ws._socket.on('end', () => {
        clientTrace.push('raw end');
      });
      ws._socket.on('close', (hadError) => {
        clientTrace.push(
          `raw close hadError=${hadError} destroyed=${ws._socket?.destroyed}`,
        );
      });
      ws._socket.on('error', (error) => {
        clientTrace.push(`raw error ${error.message}`);
      });
    }
  });

  try {
    const replayPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for ReplayEnd. Messages:\n${JSON.stringify(
              messages,
              null,
              2,
            )}\nClient trace:\n${clientTrace.join(
              '\n',
            )}\nServer output:\n${getOutput()}`,
          ),
        );
      }, 20_000);

      ws.on('message', (raw) => {
        const parsed = JSON.parse(raw.toString());
        messages.push(parsed);
        if (parsed.kind === 'Close' || parsed.kind === 'Error') {
          clearTimeout(timeout);
          reject(
            new Error(
              `Socket failed with ${JSON.stringify(
                parsed,
                null,
                2,
              )}\nClient trace:\n${clientTrace.join(
                '\n',
              )}\nServer output:\n${getOutput()}`,
            ),
          );
          return;
        }
        if (parsed.kind === 'ReplayEnd') {
          clearTimeout(timeout);
          resolve();
        }
      });
      ws.once('close', (code, reason) => {
        clientTrace.push(`close code=${code} reason=${reason.toString()}`);
        clearTimeout(timeout);
        setTimeout(() => {
          reject(
            new Error(
              `Socket closed before ReplayEnd (${code} ${reason.toString()}). Messages:\n${JSON.stringify(
                messages,
                null,
                2,
              )}\nClient trace:\n${clientTrace.join(
                '\n',
              )}\nServer output:\n${getOutput()}`,
            ),
          );
        }, 500);
      });
      ws.once('error', (error) => {
        clearTimeout(timeout);
        setTimeout(() => {
          reject(
            new Error(
              `Socket errored before ReplayEnd: ${
                error instanceof Error ? error.message : String(error)
              }\nUrl: ${url}\nMessages:\n${JSON.stringify(
                messages,
                null,
                2,
              )}\nServer output:\n${getOutput()}`,
            ),
          );
        }, 500);
      });
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out opening WebSocket')),
        20_000,
      );
      ws.once('open', () => {
        clearTimeout(timeout);
        clientTrace.push('open');
        resolve();
      });
      ws.once('error', (error) => {
        clearTimeout(timeout);
        setTimeout(() => {
          reject(
            new Error(
              `Socket failed to open: ${
                error instanceof Error ? error.message : String(error)
              }\nUrl: ${url}\nClient trace:\n${clientTrace.join(
                '\n',
              )}\nServer output:\n${getOutput()}`,
            ),
          );
        }, 500);
      });
    });

    clientTrace.push(`send SessionJoin readyState=${ws.readyState}`);
    ws.send(
      JSON.stringify({
        kind: 'SessionJoin',
        matchId,
        ts: new Date().toISOString(),
        playerId,
        token: wireToken,
        lastSeq: 0,
      }),
      (error) => {
        clientTrace.push(
          error
            ? `send callback error ${error.message}`
            : `send callback ok readyState=${ws.readyState}`,
        );
      },
    );
    clientTrace.push('sent SessionJoin');
    await replayPromise;
  } finally {
    ws.close();
  }

  const kinds = messages.map((message) => message.kind);
  if (!kinds.includes('ReplayStart') || !kinds.includes('ReplayEnd')) {
    throw new Error(`Missing replay frames: ${kinds.join(', ')}`);
  }
  return kinds;
}

function resolveServerStart(npmExecutable) {
  if (!standaloneDirArg) {
    return {
      command: npmExecutable,
      args: ['run', 'start'],
      cwd: repoRoot,
      label: 'npm run start',
      shell: process.platform === 'win32',
    };
  }

  const serverPath = path.join(standaloneDir, 'server.js');
  if (electronNodeExe) {
    return {
      command: electronNodeExe,
      args: [serverPath],
      cwd: standaloneDir,
      label: `Electron Node standalone ${serverPath}`,
      shell: false,
    };
  }

  return {
    command: process.execPath,
    args: [serverPath],
    cwd: standaloneDir,
    label: `Node standalone ${serverPath}`,
    shell: false,
  };
}

async function startPackagedServer(npmExecutable) {
  const start = resolveServerStart(npmExecutable);
  const child = spawn(start.command, start.args, {
    cwd: start.cwd,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
      NODE_ENV: 'production',
      ...(electronNodeExe ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      MULTIPLAYER_SOCKET_TRACE: '1',
      MULTIPLAYER_STORE: process.env.MULTIPLAYER_STORE ?? 'durable',
      MULTIPLAYER_DB_PATH: dbPath,
      DATABASE_PATH: dbPath,
    },
    shell: start.shell,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const getOutput = captureServerOutput(child, start.label);
  await waitForServer(child, getOutput);
  return { child, getOutput };
}

function stopServer(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
    });
    return;
  }
  child.kill('SIGTERM');
}

// prettier-ignore
const READY_PREFIX='MEKSTATION_LISTENER_READY ', READY_KEYS=['schema','configuredHostname','boundAddress','family','port'], REJECT_HOSTS=['',' ','localhost','127.0.0.2','192.168.1.10','0.0.0.0','::','::1','not-an-ip'];
// prettier-ignore
export function createReadyParser(requestedPort) { let buf='', record=null; return {push(chunk){ const text=String(chunk); if((text.match(/MEKSTATION_LISTENER_READY /g)??[]).length>1) throw new Error('duplicate ready records'); buf+=text; for(;;){ const nl=buf.indexOf('\n'); if(nl<0){ if(Buffer.byteLength(buf)>1024&&buf.includes('MEKSTATION_LISTENER_READY')) throw new Error('ready line too long'); return record; } const line=buf.slice(0,nl); buf=buf.slice(nl+1); if(!line.includes('MEKSTATION_LISTENER_READY')) continue; if(!line.startsWith(READY_PREFIX)||Buffer.byteLength(`${line}\n`)>1024) throw new Error('malformed ready record'); const json=line.slice(READY_PREFIX.length), value=JSON.parse(json); if(JSON.stringify(value)!==json||!value||JSON.stringify(Object.keys(value))!==JSON.stringify(READY_KEYS)) throw new Error('malformed ready record'); if(value.schema!=='mekstation-packaged-listener-ready/v1'||value.configuredHostname!=='127.0.0.1'||value.boundAddress!=='127.0.0.1'||value.family!=='IPv4'||!Number.isInteger(value.port)||value.port<1||value.port>65535||value.port!==requestedPort) throw new Error('invalid ready record'); if(record) throw new Error('duplicate ready records'); record=value; } }, finish(){ if(buf.includes('MEKSTATION_LISTENER_READY')) throw new Error('malformed ready record'); if(!record) throw new Error('missing ready record'); return record; }}; }
// prettier-ignore
export function parseReadyChunks(chunks, requestedPort=43700) { const parser=createReadyParser(requestedPort); for(const chunk of chunks) parser.push(chunk); return parser.finish(); }
// prettier-ignore
export function finalizeObservation(directory, observation) { const bytes=Buffer.from(`${JSON.stringify(observation)}\n`); if(bytes.length>4096) throw new Error('observation exceeds 4096 bytes'); const temp=path.join(directory,'.listener-observation.json.tmp'), finalPath=path.join(directory,'listener-observation.json'), fd=fs.openSync(temp,'wx'); try { fs.writeSync(fd,bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } fs.linkSync(temp,finalPath); fs.unlinkSync(temp); }
// prettier-ignore
function bindPort(port=0) { return new Promise((resolve,reject)=>{ const server=net.createServer(); server.once('error',reject); server.listen(port,'127.0.0.1',()=>{ const addr=server.address(), assigned=addr&&typeof addr==='object'?addr.port:0; server.close((error)=>error?reject(error):resolve(assigned)); }); }); }
// prettier-ignore
function waitExit(child,ms) { return new Promise((resolve,reject)=>{ if(child.exitCode!==null){ resolve(child.exitCode??1); return; } const timer=setTimeout(()=>reject(new Error('child timeout')),ms); child.once('exit',(code)=>{ clearTimeout(timer); resolve(code??1); }); }); }
// prettier-ignore
async function stopChild(child,port) { if(child.pid&&process.platform==='win32') spawnSync('taskkill',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore'}); else if(child.pid) child.kill('SIGTERM'); await waitExit(child,5000); await bindPort(port); }
// prettier-ignore
function withoutHostMode(base,overlay) { const env={...base,...overlay}; if(!Object.hasOwn(overlay,'HOSTNAME')) delete env.HOSTNAME; if(!Object.hasOwn(overlay,'NODE_ENV')) delete env.NODE_ENV; return env; }
// prettier-ignore
function waitReady(child,requestedPort) { const parser=createReadyParser(requestedPort); return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>reject(new Error('ready timeout')),60_000); const onData=(chunk)=>{ try { const ready=parser.push(chunk); if(ready){ clearTimeout(timer); child.stdout.off('data',onData); resolve(ready); } } catch(error) { clearTimeout(timer); reject(error); } }; child.stdout.on('data',onData); child.once('exit',(code)=>{ clearTimeout(timer); reject(new Error(`exited ${code}`)); }); }); }
// prettier-ignore
function runCommand(args,cwd,env,timeoutMs) { return new Promise((resolve,reject)=>{ const child=spawn(process.execPath,args,{cwd,env,shell:false,stdio:['ignore','pipe','pipe']}); let tail=''; const take=(c)=>{ tail=(tail+c).slice(-8000); }; child.stdout.on('data',take); child.stderr.on('data',take); const timer=setTimeout(()=>{ child.kill(); reject(new Error(`command timeout ${tail}`)); },timeoutMs); child.once('exit',(code)=>{ clearTimeout(timer); if(code===0) resolve(); else reject(new Error(`exit ${code} ${tail}`)); }); }); }
// prettier-ignore
async function rejectHost(standalone,preload,overlay) { const port=await bindPort(0), env=withoutHostMode({...process.env,PORT:String(port),MULTIPLAYER_DB_PATH:dbPath,DATABASE_PATH:dbPath},overlay), child=spawn(process.execPath,['--require',preload,'server.js'],{cwd:standalone,env,shell:false,stdio:['ignore','pipe','pipe']}); let output=''; child.stdout.on('data',(c)=>{ output+=c; }); child.stderr.on('data',(c)=>{ output+=c; }); const code=await waitExit(child,5000); if(code===0||output.includes('NEXT_IMPORT_SENTINEL')||output.includes('MEKSTATION_LISTENER_READY')) throw new Error(`host accepted ${JSON.stringify(overlay)}`); await bindPort(port); }
// prettier-ignore
function processRecord(ready,requestedPort) { return {configuredHostname:ready.configuredHostname,boundAddress:ready.boundAddress,family:ready.family,requestedPort,boundPort:ready.port,readyRecordCount:1}; }
// prettier-ignore
function selfTest() { const rec={schema:'mekstation-packaged-listener-ready/v1',configuredHostname:'127.0.0.1',boundAddress:'127.0.0.1',family:'IPv4',port:43700}, full=`${READY_PREFIX}${JSON.stringify(rec)}\n`; parseReadyChunks([full.slice(0,20),full.slice(20)]); for(const chunks of [[],[full+full],[full,full],[`x${full}`],[`${READY_PREFIX}not-json\n`],[`${READY_PREFIX}${JSON.stringify({...rec,extra:1})}\n`],[`${READY_PREFIX}${JSON.stringify({...rec,family:'IPv6'})}\n`],[`${READY_PREFIX}${JSON.stringify({...rec,boundAddress:'0.0.0.0'})}\n`],[`${READY_PREFIX}${JSON.stringify({...rec,boundAddress:'::1'})}\n`],[`${READY_PREFIX}${JSON.stringify({...rec,port:0})}\n`],[`${READY_PREFIX}${JSON.stringify({...rec,configuredHostname:'localhost'})}\n`],[`${READY_PREFIX}${'x'.repeat(1024)}\n`],[`${READY_PREFIX}${JSON.stringify({...rec,boundAddress:'\\\\.\\pipe\\x'})}\n`]]) { let threw=false; try { parseReadyChunks(chunks); } catch { threw=true; } if(!threw) throw new Error('parser self-test missed a failure'); } }
// prettier-ignore
async function runCamp00Authority() { const artifactDir=process.env.CAMP01_ARTIFACT_DIR, runId=process.env.CAMP01_RUN_ID, writerNext=process.env.CAMP01_NEXT_DIST_DIR; if(!artifactDir||!runId||!writerNext) throw new Error('camp-00 environment missing'); const lease=createHash('sha256').update(runId).digest('hex'), distRel='.next', nextDist=path.join(repoRoot,'.next'), buildEnv={...process.env,CAMP01_NEXT_DIST_DIR:distRel,CAMP01_RUNTIME_LEASE:lease,MEKSTATION_NEXT_DIST_DIR:distRel,CI:'1',NEXT_TELEMETRY_DISABLED:'1'}, standalone=path.join(nextDist,'standalone'); try { await runCommand(['scripts/next/run-next.mjs','build','--webpack'],repoRoot,buildEnv,8*60_000); await runCommand(['scripts/hydrate-next-standalone-multiplayer-server.mjs'],repoRoot,buildEnv,60_000); if(!fs.existsSync(path.join(standalone,'server.js'))||!fs.existsSync(path.join(standalone,'server.next-config.json'))) throw new Error('standalone missing'); const preload=path.join(nextDist,'next-import-sentinel.cjs'); fs.writeFileSync(preload,"const M=require('module');const o=M._load;M._load=function(r,...a){if(r==='next')throw new Error('NEXT_IMPORT_SENTINEL');return o.call(this,r,...a);};\n"); const port=await bindPort(0), origin=`http://127.0.0.1:${port}`, serverEnv={...process.env,PORT:String(port),MULTIPLAYER_STORE:process.env.MULTIPLAYER_STORE??'durable',MULTIPLAYER_DB_PATH:dbPath,DATABASE_PATH:dbPath}; const start=(overlay)=>spawn(process.execPath,['server.js'],{cwd:standalone,env:withoutHostMode(serverEnv,overlay),shell:false,stdio:['ignore','pipe','pipe']}); const initial=start({}), initialReady=await waitReady(initial,port), {wireToken,playerId}=await issueWireToken(), match=await createMatch(wireToken,playerId,()=>'',origin); await openAndJoin(match.wsUrl,wireToken,playerId,match.matchId,()=>''); await stopChild(initial,port); const restarted=start({HOSTNAME:'127.0.0.1',NODE_ENV:'development'}), restartReady=await waitReady(restarted,port); await openAndJoin(match.wsUrl,wireToken,playerId,match.matchId,()=>''); await stopChild(restarted,port); for(const host of REJECT_HOSTS) await rejectHost(standalone,preload,{HOSTNAME:host}); for(const host of ['0.0.0.0','::','192.168.1.10']) await rejectHost(standalone,preload,{HOSTNAME:host,NODE_ENV:'development'}); finalizeObservation(artifactDir,{schema:'camp01-listener-observation/v1',wave:'camp-00',parentRunId:runId,initialHostnameInput:'omitted',restartHostnameInput:'127.0.0.1',packagedModeEnvironmentIndependent:true,initial:processRecord(initialReady,port),restart:processRecord(restartReady,port),ipv4UnspecifiedRejected:true,ipv6UnspecifiedRejected:true,ipv6LoopbackRejected:true,hostnameMatrixPassed:true,rejectedBeforeNextPrepare:true,standalonePreparedInArtifactDir:true,packagedSocketJourneyPassed:true,observationNoReplaceFinalized:true,portReusableAfterEachChild:true}); } finally { fs.rmSync(nextDist,{recursive:true,force:true}); } }
async function main() {
  // prettier-ignore
  if (process.env.CAMP01_ARTIFACT_DIR && process.env.CAMP01_RUN_ID && process.env.CAMP01_NEXT_DIST_DIR) { await runCamp00Authority(); return; }
  assertHydratedStandaloneServer();

  const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  let child = null;

  try {
    const firstServer = await startPackagedServer(npmExecutable);
    child = firstServer.child;
    const { wireToken, playerId } = await issueWireToken();
    const match = await createMatch(wireToken, playerId, firstServer.getOutput);
    const kinds = await openAndJoin(
      match.wsUrl,
      wireToken,
      playerId,
      match.matchId,
      firstServer.getOutput,
    );
    stopServer(child);
    child = null;
    await delay(500);

    const restartedServer = await startPackagedServer(npmExecutable);
    child = restartedServer.child;
    const reconnectFrames = await openAndJoin(
      match.wsUrl,
      wireToken,
      playerId,
      match.matchId,
      restartedServer.getOutput,
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          packagedMultiplayerReachability: 'socket-upgrade-and-replay-ok',
          packagedRestartReconnect:
            'same-match-replay-after-process-restart-ok',
          startMode,
          startScript: standaloneDirArg
            ? electronNodeExe
              ? `${electronNodeExe} ${path.join(standaloneDir, 'server.js')}`
              : `${process.execPath} ${path.join(standaloneDir, 'server.js')}`
            : 'npm run start',
          standaloneDir,
          baseUrl,
          dbPath,
          matchId: match.matchId,
          roomCode: match.roomCode,
          frames: kinds,
          reconnectFrames,
        },
        null,
        2,
      ),
    );
  } finally {
    if (child) stopServer(child);
    await delay(100);
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(`${dbPath}${suffix}`, { force: true });
      } catch {
        // Best-effort cleanup only.
      }
    }
  }
}

if (process.argv.includes('--self-test')) selfTest();
// prettier-ignore
else if (
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
)
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
