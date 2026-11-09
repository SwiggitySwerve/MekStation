import net from 'node:net';

import {
  resolveDevPort,
  assertDevPortAvailable,
  devServerArguments,
} from '../next/dev-port.cjs';

describe('development port boundary', () => {
  it('defaults to 3600 and honors an explicit PORT', () => {
    expect(resolveDevPort(undefined)).toBe(3600);
    expect(resolveDevPort('3687')).toBe(3687);
  });

  it.each(['', '0', '-1', '65536', '3600garbage', '3.6', 'NaN'])(
    'rejects invalid PORT %j',
    (value) => expect(() => resolveDevPort(value)).toThrow('Invalid PORT'),
  );

  it('releases a free port after probing it', async () => {
    const probe = net.createServer();
    await new Promise<void>((resolve) => probe.listen(0, resolve));
    const port = (probe.address() as net.AddressInfo).port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const findOwner = jest.fn();
    await assertDevPortAvailable(port, { findOwner });
    await assertDevPortAvailable(port, { findOwner });
    expect(findOwner).not.toHaveBeenCalled();
  });

  it('names the occupied port and PID and leaves the listener alive', async () => {
    const listener = net.createServer((socket) => socket.end('still alive'));
    await new Promise<void>((resolve) => listener.listen(0, resolve));
    const port = (listener.address() as net.AddressInfo).port;
    const findOwner = jest.fn(() => 23456);
    try {
      await expect(assertDevPortAvailable(port, { findOwner })).rejects.toThrow(
        new RegExp(`Port ${port}.*PID 23456.*PORT`),
      );
      expect(findOwner).toHaveBeenCalledWith(port);
      const response = await new Promise<string>((resolve, reject) => {
        const socket = net.connect(port, 'localhost');
        socket.on('error', reject);
        socket.on('data', (data) => resolve(data.toString()));
      });
      expect(response).toBe('still alive');
    } finally {
      await new Promise<void>((resolve) => listener.close(() => resolve()));
    }
  });

  it('still refuses the port when PID enumeration is unavailable', async () => {
    const listener = net.createServer();
    await new Promise<void>((resolve) => listener.listen(0, resolve));
    const port = (listener.address() as net.AddressInfo).port;
    try {
      await expect(
        assertDevPortAvailable(port, {
          findOwner: () => {
            throw new Error('enumeration unavailable');
          },
        }),
      ).rejects.toThrow(/PID lookup failed.*enumeration unavailable/);
      expect(listener.listening).toBe(true);
    } finally {
      await new Promise<void>((resolve) => listener.close(() => resolve()));
    }
  });

  it('keeps the custom server and explicitly ports Next webpack mode', () => {
    expect(devServerArguments(false, 3687, '/checkout')).toEqual([
      expect.stringMatching(/[/\\]server\.js$/),
    ]);
    expect(devServerArguments(true, 3687, '/checkout')).toEqual([
      expect.stringMatching(/[/\\]next[/\\]dist[/\\]bin[/\\]next$/),
      'dev',
      '--webpack',
      '--port',
      '3687',
    ]);
  });
});
