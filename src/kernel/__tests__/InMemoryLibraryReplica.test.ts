import type { ILibraryItem } from '../types/LibraryItem';

import { hashLibraryContent } from '../repositories/InMemoryLibraryRepository';
import { InMemoryLibraryReplica } from '../sync/InMemoryLibraryReplica';

function item(id: string, content: string, version = 1): ILibraryItem {
  return {
    itemId: id,
    contentType: 'card',
    version,
    contentHash: hashLibraryContent(content),
    content,
  };
}

describe('InMemoryLibraryReplica', () => {
  it('converges while connected and conflicts after a partition', () => {
    const alpha = new InMemoryLibraryReplica();
    const beta = new InMemoryLibraryReplica();
    alpha.connect(beta);
    alpha.put(item('card-1', '{"name":"ace"}'));
    expect(beta.get('card-1')?.content).toBe('{"name":"ace"}');

    alpha.disconnect();
    alpha.put(item('card-1', '{"name":"ace-local"}', 2));
    beta.put(item('card-1', '{"name":"ace-remote"}', 2));
    alpha.connect(beta);
    const exchanges = alpha.syncFromPeer();
    expect(exchanges).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'conflict' })]),
    );
    const conflict = exchanges.find((entry) => entry.kind === 'conflict');
    if (!conflict || conflict.kind !== 'conflict') {
      throw new Error('Expected a partition conflict');
    }
    expect(alpha.resolve(conflict.conflict, 'keepLocal').content).toBe(
      '{"name":"ace-local"}',
    );
    expect(alpha.resolve(conflict.conflict, 'acceptRemote').content).toBe(
      '{"name":"ace-remote"}',
    );
    const forked = alpha.resolve(conflict.conflict, 'fork');
    expect(forked.itemId).toBe('card-1:fork');
    expect(alpha.get('card-1')?.content).toBe('{"name":"ace-local"}');
    expect(alpha.get('card-1:fork')?.content).toBe('{"name":"ace-remote"}');
  });
});
