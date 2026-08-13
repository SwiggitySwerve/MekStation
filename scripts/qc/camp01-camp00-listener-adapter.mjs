import * as fs from 'node:fs';
import * as path from 'node:path';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import { canonicalBytes } from './camp01-authority-receipt.schemas.mjs';

const RUN_ID = /^camp01-[0-9a-f]{32}$/,
  OBSERVATION = 'listener-observation.json',
  TEMP = '.listener-observation.json.tmp',
  MAX_BYTES = 4096;
const PROCESS_KEYS = [
  'configuredHostname',
  'boundAddress',
  'family',
  'requestedPort',
  'boundPort',
  'readyRecordCount',
];
const OBSERVATION_KEYS = [
  'schema',
  'wave',
  'parentRunId',
  'initialHostnameInput',
  'restartHostnameInput',
  'packagedModeEnvironmentIndependent',
  'initial',
  'restart',
  'ipv4UnspecifiedRejected',
  'ipv6UnspecifiedRejected',
  'ipv6LoopbackRejected',
  'hostnameMatrixPassed',
  'rejectedBeforeNextPrepare',
  'standalonePreparedInArtifactDir',
  'packagedSocketJourneyPassed',
  'observationNoReplaceFinalized',
  'portReusableAfterEachChild',
];

export class Camp01Camp00AdapterError extends Error {
  constructor(message) {
    super(`CAMP01_WRITER_INVALID: ${message}`);
    this.name = 'Camp01Camp00AdapterError';
  }
}

export function convertCamp00Observation({
  directory,
  runId,
  runtimeRoot = null,
  afterFirstRead = null,
}) {
  if (!RUN_ID.test(runId) || typeof directory !== 'string')
    fail('camp-00 observation input drift');
  const root = path.resolve(directory),
    observationPath = path.join(root, OBSERVATION),
    tempPath = path.join(root, TEMP);
  if (fs.existsSync(tempPath)) fail('observation temp present');
  const names = fs.readdirSync(root);
  if (names.some((name) => name !== OBSERVATION))
    fail('undeclared observation sibling');
  const link = fs.lstatSync(observationPath);
  if (link.isSymbolicLink() || !link.isFile())
    fail('observation is not a regular file');
  if (link.size > MAX_BYTES) fail('observation exceeds 4096 bytes');
  const fd = fs.openSync(observationPath, 'r');
  let observation;
  try {
    const first = readHandle(fd, link.size);
    if (typeof afterFirstRead === 'function') afterFirstRead(observationPath);
    const second = readHandle(fd, link.size);
    if (!first.equals(second)) fail('observation unstable across reads');
    const handle = fs.fstatSync(fd);
    if (!handle.isFile() || handle.size !== link.size)
      fail('observation handle identity drift');
    const again = fs.lstatSync(observationPath);
    if (again.isSymbolicLink() || again.size !== link.size)
      fail('observation path identity drift');
    const text = first.toString('utf8');
    observation = JSON.parse(text);
    if (text !== canonicalBytes(observation))
      fail('non-canonical observation bytes');
    assertObservation(observation, runId);
  } finally {
    fs.closeSync(fd);
  }
  fs.unlinkSync(observationPath);
  if (fs.existsSync(observationPath) || fs.existsSync(tempPath))
    fail('observation retained');
  if (runtimeRoot) {
    const runtime = path.resolve(runtimeRoot);
    fs.rmSync(runtime, { recursive: true, force: true });
    if (fs.existsSync(runtime)) fail('runtime retained');
  }
  const listener = {
    schema: 'camp01-listener-result/v1',
    wave: 'camp-00',
    runId,
    boundAddress: '127.0.0.1',
    expectedAddressMatched: true,
    unspecifiedAddressRejected: true,
  };
  const assertions = Object.fromEntries(
    [...WAVE_CONTRACTS['camp-00'].assertions].sort().map((id) => [id, true]),
  );
  const wave = {
    schema: 'camp01-wave-result/v1',
    wave: 'camp-00',
    runId,
    status: 'passed',
    assertions,
  };
  writeExclusive(path.join(root, 'listener-result.json'), listener);
  writeExclusive(path.join(root, 'wave-result.json'), wave);
}

export function validCamp00Observation(runId, port = 43700) {
  const processRecord = {
    configuredHostname: '127.0.0.1',
    boundAddress: '127.0.0.1',
    family: 'IPv4',
    requestedPort: port,
    boundPort: port,
    readyRecordCount: 1,
  };
  return {
    schema: 'camp01-listener-observation/v1',
    wave: 'camp-00',
    parentRunId: runId,
    initialHostnameInput: 'omitted',
    restartHostnameInput: '127.0.0.1',
    packagedModeEnvironmentIndependent: true,
    initial: processRecord,
    restart: { ...processRecord },
    ipv4UnspecifiedRejected: true,
    ipv6UnspecifiedRejected: true,
    ipv6LoopbackRejected: true,
    hostnameMatrixPassed: true,
    rejectedBeforeNextPrepare: true,
    standalonePreparedInArtifactDir: true,
    packagedSocketJourneyPassed: true,
    observationNoReplaceFinalized: true,
    portReusableAfterEachChild: true,
  };
}

function assertObservation(value, runId) {
  exactKeys(value, OBSERVATION_KEYS, 'listener observation');
  if (
    value.schema !== 'camp01-listener-observation/v1' ||
    value.wave !== 'camp-00' ||
    value.parentRunId !== runId ||
    value.initialHostnameInput !== 'omitted' ||
    value.restartHostnameInput !== '127.0.0.1' ||
    value.packagedModeEnvironmentIndependent !== true ||
    value.ipv4UnspecifiedRejected !== true ||
    value.ipv6UnspecifiedRejected !== true ||
    value.ipv6LoopbackRejected !== true ||
    value.hostnameMatrixPassed !== true ||
    value.rejectedBeforeNextPrepare !== true ||
    value.standalonePreparedInArtifactDir !== true ||
    value.packagedSocketJourneyPassed !== true ||
    value.observationNoReplaceFinalized !== true ||
    value.portReusableAfterEachChild !== true
  )
    fail('listener observation drift');
  assertProcess(value.initial);
  assertProcess(value.restart);
  if (value.initial.requestedPort !== value.restart.requestedPort)
    fail('listener observation drift');
}

function assertProcess(value) {
  exactKeys(value, PROCESS_KEYS, 'listener process');
  if (
    value.configuredHostname !== '127.0.0.1' ||
    value.boundAddress !== '127.0.0.1' ||
    value.family !== 'IPv4' ||
    value.readyRecordCount !== 1 ||
    !Number.isInteger(value.requestedPort) ||
    value.requestedPort < 1 ||
    value.requestedPort > 65535 ||
    value.boundPort !== value.requestedPort
  )
    fail('listener process drift');
}

function readHandle(fd, size) {
  const buffer = Buffer.alloc(size);
  const read = fs.readSync(fd, buffer, 0, size, 0);
  if (read !== size) fail('observation read drift');
  return buffer;
}

function writeExclusive(file, value) {
  fs.writeFileSync(file, canonicalBytes(value), { flag: 'wx' });
}

function exactKeys(value, expected, label) {
  if (!value || JSON.stringify(Object.keys(value)) !== JSON.stringify(expected))
    fail(`${label} fields drift`);
}

function fail(message) {
  throw new Camp01Camp00AdapterError(message);
}
