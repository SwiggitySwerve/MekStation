import * as fs from 'fs/promises';
import * as path from 'path';

export const PATH_OUTSIDE_SANDBOX_ERROR = 'Path outside sandbox root';

interface IResolveWithinSandboxOptions {
  readonly targetMustExist?: boolean;
}

export async function resolveWithinSandbox(
  filePath: string,
  allowedRoots: readonly string[],
  options: IResolveWithinSandboxOptions = {},
): Promise<string> {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error(PATH_OUTSIDE_SANDBOX_ERROR);
  }

  const roots = await Promise.all(
    allowedRoots
      .filter((root) => root.trim().length > 0)
      .map((root) => resolveExistingOrAbsolute(root)),
  );
  if (roots.length === 0) {
    throw new Error(PATH_OUTSIDE_SANDBOX_ERROR);
  }

  const target = options.targetMustExist
    ? await fs.realpath(filePath)
    : await resolveWritableTarget(filePath);
  if (!roots.some((root) => isContainedByRoot(target, root))) {
    throw new Error(PATH_OUTSIDE_SANDBOX_ERROR);
  }
  return target;
}

async function resolveExistingOrAbsolute(value: string): Promise<string> {
  try {
    return await fs.realpath(value);
  } catch {
    return path.resolve(value);
  }
}

async function resolveWritableTarget(filePath: string): Promise<string> {
  try {
    return await fs.realpath(filePath);
  } catch {
    const absolute = path.resolve(filePath);
    const parent = await resolveNearestExistingParent(path.dirname(absolute));
    return path.join(parent.realPath, path.relative(parent.path, absolute));
  }
}

async function resolveNearestExistingParent(
  startPath: string,
): Promise<{ path: string; realPath: string }> {
  let current = path.resolve(startPath);
  while (true) {
    try {
      return { path: current, realPath: await fs.realpath(current) };
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return { path: current, realPath: current };
      }
      current = parent;
    }
  }
}

function isContainedByRoot(target: string, root: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}
