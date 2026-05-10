import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';

import { Result, ResultType } from '../../types/BaseTypes';

interface ICreateBackupArchiveParams {
  readonly backupPath: string;
  readonly compressionLevel: number;
  readonly dataPath: string;
  readonly files: string[];
}

interface IArchiveFile {
  readonly content: string;
  readonly path: string;
  readonly size: number;
}

interface IBackupArchive {
  readonly files: IArchiveFile[];
  readonly version: string;
}

export function generateBackupId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = crypto.randomBytes(4).toString('hex');
  return `backup-${timestamp}-${random}`;
}

export async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir);

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    const stats = await fs.stat(entryPath);

    if (stats.isDirectory()) {
      const subFiles = await getAllFiles(entryPath);
      files.push(...subFiles);
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

export function shouldExcludeFile(
  filePath: string,
  excludePatterns: readonly string[],
): boolean {
  const fileName = path.basename(filePath);
  return excludePatterns.some((pattern) => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(fileName);
  });
}

export async function createBackupArchive({
  backupPath,
  compressionLevel,
  dataPath,
  files,
}: ICreateBackupArchiveParams): Promise<void> {
  const writeStream = createWriteStream(backupPath);
  const gzipStream = createGzip({ level: compressionLevel });

  const archiveData = JSON.stringify({
    version: '1.0',
    files: await Promise.all(
      files.map(async (file) => {
        const relativePath = path.relative(dataPath, file);
        const content = await fs.readFile(file);
        return {
          path: relativePath,
          content: content.toString('base64'),
          size: content.length,
        };
      }),
    ),
  });

  await pipeline(
    async function* () {
      yield Buffer.from(archiveData);
    },
    gzipStream,
    writeStream,
  );
}

export async function extractBackupArchive(
  backupPath: string,
  extractPath: string,
): Promise<ResultType<void, string>> {
  try {
    const readStream = createReadStream(backupPath);
    const gunzipStream = createGunzip();

    let data = '';
    gunzipStream.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });

    await pipeline(readStream, gunzipStream);

    const archive = JSON.parse(data) as IBackupArchive;

    for (const file of archive.files) {
      const filePath = path.join(extractPath, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const content = Buffer.from(file.content, 'base64');
      await fs.writeFile(filePath, content);
    }

    return Result.success(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Result.error(`Failed to extract archive: ${message}`);
  }
}

export async function calculateFileChecksum(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = createReadStream(filePath);

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
