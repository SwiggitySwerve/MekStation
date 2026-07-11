import { affordance, type SweptScreenEntry } from './screenInventory.types';

/** Recovery routes swept without scenario data. */
export const recoveryEntries: readonly SweptScreenEntry[] = [
  {
    id: 'recovery-invalid-share-token',
    class: 'recovery',
    label: 'invalid share token',
    manifestPaths: ['/share/e2e-missing-token'],
    goto: '/share/e2e-missing-token',
    primaryAffordances: [
      affordance({ label: 'go home action', role: 'button', name: /Go Home/i }),
    ],
    overlapTargets: [
      affordance({
        label: 'retry share token action',
        role: 'button',
        name: /Try Again/i,
      }),
      affordance({ label: 'go home action', role: 'button', name: /Go Home/i }),
    ],
    quarantine: [],
  },
  {
    id: 'recovery-global-not-found',
    class: 'recovery',
    label: 'global not found',
    manifestPaths: ['/app-shell-e2e-missing-route'],
    goto: '/app-shell-e2e-missing-route',
    primaryAffordances: [
      affordance({
        label: 'dashboard recovery link',
        role: 'link',
        name: /Go to Dashboard/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'dashboard recovery link',
        role: 'link',
        name: /Go to Dashboard/i,
      }),
      affordance({
        label: 'gameplay recovery link',
        role: 'link',
        name: /Open Gameplay/i,
      }),
      affordance({
        label: 'replay library recovery link',
        role: 'link',
        name: /Open Replay Library/i,
      }),
    ],
    quarantine: [],
  },
];
