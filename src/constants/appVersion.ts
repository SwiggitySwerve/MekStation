const FALLBACK_APP_VERSION = '0.0.0';

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const APP_VERSION =
  readEnv('NEXT_PUBLIC_APP_VERSION') ??
  readEnv('APP_VERSION') ??
  readEnv('npm_package_version') ??
  FALLBACK_APP_VERSION;

export const BUILD_VERSION =
  readEnv('NEXT_PUBLIC_BUILD_VERSION') ??
  readEnv('BUILD_VERSION') ??
  APP_VERSION;

export const APP_VERSION_LABEL = `v${BUILD_VERSION}`;
