import { logger } from '@/utils/logger';

interface ErrorResponseBody {
  error?: string;
}

export async function buildResponseError(
  response: Response,
  debugMessage: string,
  fallbackMessage: string,
): Promise<Error> {
  const errorData = (await response.json().catch((error) => {
    logger.debug(debugMessage, error);
    return {};
  })) as ErrorResponseBody;

  return new Error(
    errorData.error || `${fallbackMessage} (${response.status})`,
  );
}
