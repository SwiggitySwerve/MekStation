export function readJson(file: string): unknown;
export function readRows(file: string): unknown[];
export function parseRows(bytes: Buffer | string): unknown[];
export function sha256(bytes: string | Buffer): string;
export function verifySha256(
  bytes: string | Buffer,
  expected: string,
  label: string,
): void;
