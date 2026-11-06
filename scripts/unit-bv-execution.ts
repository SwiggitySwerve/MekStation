/** Execution and disposable artifact caching; no conversion or BV rules. */
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { deserialize, serialize } from 'node:v8';

const digest = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');

/** Hash every file, including additions. Unreadable or linked inputs disable reuse. */
export function fingerprint(
  roots: readonly string[],
  context: unknown,
): string | null {
  try {
    const hash = createHash('sha256').update(JSON.stringify(context));
    const visit = (file: string): void => {
      const stat = fs.lstatSync(file);
      hash.update(JSON.stringify(file));
      if (stat.isSymbolicLink()) throw new Error(`Linked input: ${file}`);
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(file).sort()) {
          if (entry !== '__pycache__') visit(path.join(file, entry));
        }
      } else if (stat.isFile()) {
        hash.update(digest(fs.readFileSync(file)));
      } else throw new Error(`Unknown input: ${file}`);
    };
    roots.forEach(visit);
    return hash.digest('hex');
  } catch {
    return null;
  }
}

export async function boundedMap<T, R>(
  values: readonly T[],
  workers: number,
  work: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(workers) || workers < 1 || workers > 4)
    throw new Error('workers must be an integer from 1 to 4');
  const results: R[] = [];
  let next = 0;
  let failure: unknown;
  let failed = false;
  await Promise.all(
    Array.from({ length: Math.min(workers, values.length) }, async () => {
      while (!failed && next < values.length) {
        const index = next++;
        try {
          results[index] = await work(values[index], index);
        } catch (error) {
          failed = true;
          failure = error;
        }
      }
    }),
  );
  if (failed) throw failure;
  return results;
}

export interface IFamilyArtifacts {
  sources: Buffer;
  computed: Buffer;
}
interface ICacheEntry extends IFamilyArtifacts {
  key: string;
  sourcesHash: string;
  computedHash: string;
}
const isEntry = (value: unknown): value is ICacheEntry => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Partial<ICacheEntry>;
  return (
    typeof row.key === 'string' &&
    Buffer.isBuffer(row.sources) &&
    Buffer.isBuffer(row.computed) &&
    row.sourcesHash === digest(row.sources) &&
    row.computedHash === digest(row.computed)
  );
};

export async function runCachedFamily(options: {
  cacheDir?: string;
  family: string;
  key: string | null;
  verify: boolean | (() => boolean);
  produce: () => Promise<IFamilyArtifacts>;
}): Promise<{ artifacts: IFamilyArtifacts; hit: boolean; verified: boolean }> {
  const { cacheDir, family, key, verify, produce } = options;
  if (!/^[a-z]+$/.test(family)) throw new Error('Invalid family');
  const file =
    cacheDir && key && /^[a-f0-9]{64}$/.test(key)
      ? path.join(cacheDir, `${family}-${key}.bin`)
      : undefined;
  let cached: ICacheEntry | undefined;
  if (file) {
    try {
      const value: unknown = deserialize(fs.readFileSync(file));
      if (isEntry(value) && value.key === key) cached = value;
    } catch {
      /* Disposable cache: missing, corrupt and incompatible entries run fresh. */
    }
  }
  const shouldVerify = Boolean(
    cached && (typeof verify === 'function' ? verify() : verify),
  );
  if (cached && !shouldVerify)
    return {
      artifacts: { sources: cached.sources, computed: cached.computed },
      hit: true,
      verified: false,
    };
  const artifacts = await produce();
  if (
    cached &&
    (!cached.sources.equals(artifacts.sources) ||
      !cached.computed.equals(artifacts.computed))
  ) {
    if (file) {
      try {
        fs.unlinkSync(file);
      } catch {
        /* Already unavailable. */
      }
    }
    throw new Error(`Family cache verification failed: ${family}`);
  }
  if (file) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        temporary,
        serialize({
          key,
          ...artifacts,
          sourcesHash: digest(artifacts.sources),
          computedHash: digest(artifacts.computed),
        }),
      );
      fs.renameSync(temporary, file);
    } catch {
      /* Cache availability cannot suppress the fresh result. */
    } finally {
      try {
        fs.unlinkSync(temporary);
      } catch {
        /* Renamed or never written. */
      }
    }
  }
  return { artifacts, hit: Boolean(cached), verified: shouldVerify };
}
