export function readJson(file: string): unknown;
export function readRows(file: string): unknown[];
export function parseRows(bytes: Buffer | string): unknown[];
export function sha256(bytes: string | Buffer): string;
export function compareText(a: string, b: string): number;
export function verifySha256(
  bytes: string | Buffer,
  expected: string,
  label: string,
): void;
export interface IReferenceArtifact {
  file: string;
  gzipSha256: string;
  sha256: string;
  sidecar: string;
  sidecarSha256: string;
}
export function loadReference(
  root: string,
  reference: IReferenceArtifact,
): { bytes: Buffer; sidecar: Buffer };
