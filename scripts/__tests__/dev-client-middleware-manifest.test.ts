import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH,
  serveDevClientMiddlewareManifest,
} = require('../../src/lib/server/devClientMiddlewareManifest.js');

type TestResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer | undefined;
  setHeader(name: string, value: string): void;
  end(body?: Buffer): void;
};

const tempRoots: string[] = [];

function createResponse(): TestResponse {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

function createManifestRoot(): { rootDir: string; manifest: Buffer } {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'mekstation-dev-manifest-'),
  );
  tempRoots.push(rootDir);
  const manifestPath = path.join(
    rootDir,
    '.next',
    'dev',
    'static',
    'development',
    '_clientMiddlewareManifest.js',
  );
  const manifest = Buffer.from(
    'self.__MIDDLEWARE_MATCHERS = []; self.__MIDDLEWARE_MATCHERS_CB?.();',
  );
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, manifest);
  return { rootDir, manifest };
}

describe('dev client middleware manifest response', () => {
  afterEach(() => {
    for (const rootDir of tempRoots.splice(0)) {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('serves the generated JavaScript manifest with an executable MIME type', () => {
    const { rootDir, manifest } = createManifestRoot();
    const response = createResponse();

    expect(
      serveDevClientMiddlewareManifest({
        dev: true,
        method: 'GET',
        pathname: DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH,
        response,
        rootDir,
      }),
    ).toBe(true);
    expect(response).toMatchObject({
      statusCode: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Content-Length': String(manifest.byteLength),
        'Content-Type': 'application/javascript; charset=utf-8',
      },
      body: manifest,
    });
  });

  it('delegates outside the exact development GET/HEAD boundary', () => {
    const { rootDir } = createManifestRoot();

    expect(
      serveDevClientMiddlewareManifest({
        dev: false,
        method: 'GET',
        pathname: DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH,
        response: createResponse(),
        rootDir,
      }),
    ).toBe(false);
    expect(
      serveDevClientMiddlewareManifest({
        dev: true,
        method: 'POST',
        pathname: DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH,
        response: createResponse(),
        rootDir,
      }),
    ).toBe(false);
    expect(
      serveDevClientMiddlewareManifest({
        dev: true,
        method: 'GET',
        pathname: `${DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH}.map`,
        response: createResponse(),
        rootDir,
      }),
    ).toBe(false);
    expect(
      serveDevClientMiddlewareManifest({
        dev: true,
        method: 'GET',
        pathname: DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH,
        response: createResponse(),
        rootDir: path.join(rootDir, 'missing'),
      }),
    ).toBe(false);
  });

  it('answers HEAD without sending the manifest body', () => {
    const { rootDir, manifest } = createManifestRoot();
    const response = createResponse();

    expect(
      serveDevClientMiddlewareManifest({
        dev: true,
        method: 'HEAD',
        pathname: DEV_CLIENT_MIDDLEWARE_MANIFEST_PATH,
        response,
        rootDir,
      }),
    ).toBe(true);
    expect(response.headers['Content-Length']).toBe(
      String(manifest.byteLength),
    );
    expect(response.body).toBeUndefined();
  });
});
