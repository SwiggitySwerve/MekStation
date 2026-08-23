import {
  assertKernelChannel,
  KernelConsistencyError,
} from '../types/Consistency';

describe('kernel consistency channel', () => {
  it('allows library items on the CRDT channel', () => {
    expect(() => {
      assertKernelChannel('library-item', 'library-crdt');
    }).not.toThrow();
  });

  it('rejects save-envelope and instance mutations on the CRDT channel', () => {
    expect(() => {
      assertKernelChannel('save-envelope', 'library-crdt');
    }).toThrow(KernelConsistencyError);
    expect(() => {
      assertKernelChannel('instance', 'library-crdt');
    }).toThrow(KernelConsistencyError);
    expect(() => {
      assertKernelChannel('save-envelope', 'save-ledger');
    }).not.toThrow();
  });
});
