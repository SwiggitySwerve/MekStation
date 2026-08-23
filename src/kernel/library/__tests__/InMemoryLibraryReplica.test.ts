import type { ILibraryItem } from '../LibraryItem';

import { InMemoryLibraryReplica } from '../InMemoryLibraryReplica';
import { hashLibraryContent } from '../InMemoryLibraryRepository';

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

  it('does not leak writes made while partitioned', () => {
    const alpha = new InMemoryLibraryReplica();
    const beta = new InMemoryLibraryReplica();
    alpha.connect(beta);
    alpha.disconnect();
    expect(alpha.isConnected()).toBe(false);
    expect(beta.isConnected()).toBe(false);

    alpha.put(item('card-1', '{"name":"ace-local"}'));

    expect(alpha.get('card-1')?.content).toBe('{"name":"ace-local"}');
    expect(beta.get('card-1')).toBeNull();
    expect(beta.syncFromPeer()).toEqual([]);
  });

  it('applies a hash-equal remote item instead of raising a conflict', () => {
    const alpha = new InMemoryLibraryReplica();
    const beta = new InMemoryLibraryReplica();
    alpha.put(item('card-1', '{"name":"ace"}'));
    beta.put(item('card-1', '{"name":"ace"}'));

    alpha.connect(beta);
    const exchanges = alpha.syncFromPeer();

    expect(exchanges).toEqual([
      { kind: 'applied', item: item('card-1', '{"name":"ace"}') },
    ]);
    expect(alpha.get('card-1')?.content).toBe('{"name":"ace"}');
  });

  it('applies an unseen remote item on first sync', () => {
    const alpha = new InMemoryLibraryReplica();
    const beta = new InMemoryLibraryReplica();
    beta.put(item('card-2', '{"name":"king"}'));

    alpha.connect(beta);
    const exchanges = alpha.syncFromPeer();

    expect(exchanges).toEqual([
      { kind: 'applied', item: item('card-2', '{"name":"king"}') },
    ]);
    expect(alpha.get('card-2')?.content).toBe('{"name":"king"}');
  });
});
