import * as Y from 'yjs';

/**
 * Each peer owns its own Y.Doc, synced both ways through update events, as in
 * production. A single shared doc does not deliver events the host appends
 * from inside its intent observer to the guest's observer.
 */
export function linkPeers(hostDoc: Y.Doc, guestDoc: Y.Doc): void {
  hostDoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') Y.applyUpdate(guestDoc, update, 'remote');
  });
  guestDoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') Y.applyUpdate(hostDoc, update, 'remote');
  });
}
