import { WebrtcProvider } from 'y-webrtc';
import * as Y from 'yjs';

/**
 * Pins the y-webrtc 10.3.0 behavior SyncProvider's retry logic depends on:
 * `status {connected:false}` is emitted by an explicit `disconnect()` call
 * (never by network loss), and `connect()` re-arms the same provider.
 *
 * The provider's `room` opens asynchronously (after the password key
 * resolves), and `connected` is `room !== null && shouldConnect`, so the
 * test waits for the initial status before toggling.
 */
describe('y-webrtc contract', () => {
  it('emits status false from disconnect() and true from connect()', async () => {
    const doc = new Y.Doc();
    const provider = new WebrtcProvider('contract-room', doc, {
      signaling: [],
    });
    const events: boolean[] = [];
    await new Promise<void>((resolve) => {
      provider.once('status', () => resolve());
    });
    provider.on('status', (event: { connected: boolean }) =>
      events.push(event.connected),
    );

    provider.disconnect();
    expect(provider.connected).toBe(false);
    provider.connect();
    expect(provider.connected).toBe(true);

    expect(events).toEqual([false, true]);
    provider.destroy();
    doc.destroy();
  });
});
