export const KERNEL_MUTATION_KINDS = [
  'library-item',
  'instance',
  'save-envelope',
] as const;

export type KernelMutationKind = (typeof KERNEL_MUTATION_KINDS)[number];

export const KERNEL_CHANNELS = ['library-crdt', 'save-ledger'] as const;

export type KernelChannel = (typeof KERNEL_CHANNELS)[number];

export class KernelConsistencyError extends Error {
  public readonly name = 'KernelConsistencyError';

  public constructor(
    public readonly mutationKind: KernelMutationKind,
    public readonly channel: KernelChannel,
  ) {
    super(`${mutationKind} mutations cannot use the ${channel} channel`);
  }
}

export function assertKernelChannel(
  mutationKind: KernelMutationKind,
  channel: KernelChannel,
): void {
  switch (mutationKind) {
    case 'library-item':
      return;
    case 'instance':
    case 'save-envelope':
      if (channel === 'library-crdt') {
        throw new KernelConsistencyError(mutationKind, channel);
      }
      return;
    default: {
      const exhaustive: never = mutationKind;
      throw new Error(`Unhandled mutation kind: ${String(exhaustive)}`);
    }
  }
}
