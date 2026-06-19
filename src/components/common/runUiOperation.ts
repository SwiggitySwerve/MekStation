interface RunUiOperationOptions<T> {
  action: () => T | Promise<T>;
  fallbackError?: string;
  setBusy?: (isBusy: boolean) => void;
  setError?: (message: string | null) => void;
  startBusy?: boolean;
}

export function errorMessageFromUnknown(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error ? error.message : fallback;
}

export async function runUiOperation<T>({
  action,
  fallbackError,
  setBusy,
  setError,
  startBusy = true,
}: RunUiOperationOptions<T>): Promise<T | undefined> {
  if (setBusy && startBusy) {
    setBusy(true);
  }
  setError?.(null);

  try {
    return await action();
  } catch (error) {
    if (!setError || !fallbackError) {
      throw error;
    }
    setError(errorMessageFromUnknown(error, fallbackError));
    return undefined;
  } finally {
    setBusy?.(false);
  }
}

export function runBusyErrorOperation<T>(
  setBusy: (isBusy: boolean) => void,
  setError: (message: string | null) => void,
  fallbackError: string,
  action: () => T | Promise<T>,
): Promise<T | undefined> {
  return runUiOperation({ action, fallbackError, setBusy, setError });
}

export function runErrorOperation<T>(
  setError: (message: string | null) => void,
  fallbackError: string,
  action: () => T | Promise<T>,
): Promise<T | undefined> {
  return runUiOperation({ action, fallbackError, setError });
}

export function runFinishLoadingOperation<T>(
  setBusy: (isBusy: boolean) => void,
  setError: (message: string | null) => void,
  fallbackError: string,
  action: () => T | Promise<T>,
): Promise<T | undefined> {
  return runUiOperation({
    action,
    fallbackError,
    setBusy,
    setError,
    startBusy: false,
  });
}

export function runBusyOperation<T>(
  setBusy: (isBusy: boolean) => void,
  action: () => T | Promise<T>,
): Promise<T | undefined> {
  return runUiOperation({ action, setBusy });
}
