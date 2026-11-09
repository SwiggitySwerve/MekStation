/* eslint-disable @typescript-eslint/no-require-imports -- shared CommonJS boundary for Node and Jest */
'use strict';

const net = require('node:net');
const path = require('node:path');

function resolveDevPort(value = '3600') {
  const port = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    throw new Error(
      `Invalid PORT: ${JSON.stringify(value)}; expected an integer from 1 to 65535.`,
    );
  return port;
}

function assertDevPortAvailable(port, { findOwner }) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error) => {
      if (error.code !== 'EADDRINUSE') {
        reject(
          new Error(`Cannot use port ${port}: ${error.message}`, {
            cause: error,
          }),
        );
        return;
      }
      let owner;
      try {
        owner = `by PID ${findOwner(port)}`;
      } catch (lookupError) {
        owner = `(PID lookup failed: ${lookupError.message})`;
      }
      reject(
        new Error(
          `Port ${port} is already in use ${owner}. Stop the holder explicitly or set PORT to a free port.`,
        ),
      );
    });
    server.listen({ port, exclusive: true }, () => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
}

function devServerArguments(nextOnly, port, repoRoot) {
  return nextOnly
    ? [
        path.join(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next'),
        'dev',
        '--webpack',
        '--port',
        String(port),
      ]
    : [path.join(repoRoot, 'server.js')];
}

module.exports = { resolveDevPort, assertDevPortAvailable, devServerArguments };
