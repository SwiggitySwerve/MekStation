export interface LoadingStorePatch {
  readonly isLoading: boolean;
  readonly error: string | null;
}

export type LoadingStoreSet = (patch: LoadingStorePatch) => void;

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function runLoadingStoreAction<T>(
  set: LoadingStoreSet,
  action: () => Promise<T>,
  fallback: T,
): Promise<T> {
  set({ isLoading: true, error: null });
  try {
    return await action();
  } catch (error) {
    set({ error: getErrorMessage(error), isLoading: false });
    return fallback;
  }
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
