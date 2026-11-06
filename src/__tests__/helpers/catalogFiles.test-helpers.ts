import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Read committed fixtures with bounded I/O, retaining index order and duplicates.
 * The thunk keeps each read error inside the consumer's per-unit try/catch.
 * JSON parsing, validation and assertions still run for every source in order.
 * Only one batch of source text is retained; nothing is cached between runs.
 */
export async function* readCatalogFiles<T extends { readonly path: string }>(
  directory: string,
  entries: readonly T[],
): AsyncGenerator<{ entry: T; read: () => string }> {
  const batchSize = 32;
  for (let offset = 0; offset < entries.length; offset += batchSize) {
    const batch = await Promise.all(
      entries.slice(offset, offset + batchSize).map(async (entry) => {
        try {
          const text = await readFile(path.join(directory, entry.path), 'utf8');
          return { entry, read: () => text };
        } catch (error) {
          return {
            entry,
            read: (): string => {
              throw error;
            },
          };
        }
      }),
    );
    yield* batch;
  }
}
