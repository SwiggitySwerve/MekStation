/* eslint-disable typescript-eslint/no-require-imports */

const fs = require('node:fs');
const path = require('node:path');

const DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH =
  '/_next/static/development/_clientMiddlewareManifest.js';

function serveDevClientMiddlewareManifest({
  dev,
  method,
  pathname,
  response,
  rootDir,
}) {
  if (
    !dev ||
    pathname !== DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH ||
    (method !== 'GET' && method !== 'HEAD')
  ) {
    return false;
  }

  const filePath = path.join(
    rootDir,
    '.next',
    'dev',
    'static',
    'development',
    '_clientMiddlewareManifest.js',
  );

  let body;
  try {
    body = fs.readFileSync(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      body = Buffer.from(
        'self.__MIDDLEWARE_MATCHERS=[];self.__MIDDLEWARE_MATCHERS_CB?.();',
      );
    } else {
      throw error;
    }
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, must-revalidate');
  response.setHeader('Content-Length', String(body.byteLength));
  response.end(method === 'HEAD' ? undefined : body);
  return true;
}

module.exports = {
  DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH,
  serveDevClientMiddlewareManifest,
};
