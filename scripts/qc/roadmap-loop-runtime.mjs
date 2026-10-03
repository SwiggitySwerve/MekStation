/** Shared CLI and receipt boundary primitives; no ledger or identity-policy dependency. */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const HEX40 = /^[0-9a-f]{40}$/;
export const UNIT_ID = /^[A-Za-z][A-Za-z0-9]*$/;
export const DATE8 = /^\d{8}$/;

export class LoopScriptError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LoopScriptError';
    this.code = code;
  }
}

export const refuse = (code, message) => {
  throw new LoopScriptError(code, message);
};
const camel = (flag) =>
  flag
    .replace(/^--/, '')
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

export function parseFlags(args, { strings = [], booleans = [] } = {}) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (booleans.includes(flag)) {
      options[camel(flag)] = true;
      continue;
    }
    if (!strings.includes(flag))
      refuse('INVALID_ARGUMENT', `unknown flag ${flag}`);
    const value = args[index + 1];
    if (value === undefined)
      refuse('INVALID_ARGUMENT', `${flag} needs a value`);
    options[camel(flag)] = value;
    index += 1;
  }
  return options;
}

export function requireFlags(options, names) {
  for (const name of names) {
    if (options[name] === undefined || options[name] === '')
      refuse(
        'INVALID_ARGUMENT',
        `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`,
      );
  }
}

export const sha256 = (buffer) =>
  createHash('sha256').update(buffer).digest('hex');
export const nowIso = () => new Date().toISOString();
export const posix = (value) => value.split(path.sep).join('/');
export const evidenceDirOf = (ledgerDir) => path.join(ledgerDir, 'evidence');

export function readJson(file) {
  if (!fs.existsSync(file)) refuse('FILE_MISSING', `${file} does not exist`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
export const writeJson = (file, value) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export function runCli(main, fallbackCode) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.code ?? fallbackCode}: ${error.message}`);
    process.exitCode = 1;
  }
}
