import { useEffect, useState } from 'react';

type TacticalMapHarnessComponent =
  (typeof import('@/testing/TacticalMapE2EHarness'))['default'];

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_MODE === 'true';

function NotAvailable(): React.JSX.Element {
  return <main style={{ padding: 40 }}>Not Available</main>;
}

export default function TacticalMapE2EPage(): React.JSX.Element {
  const [Harness, setHarness] = useState<TacticalMapHarnessComponent | null>(
    null,
  );

  useEffect(() => {
    if (!isTestEnv) return;

    let cancelled = false;
    void import('@/testing/TacticalMapE2EHarness').then(
      ({ default: Loaded }) => {
        if (!cancelled) {
          setHarness(() => Loaded);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isTestEnv) {
    return <NotAvailable />;
  }

  if (!Harness) {
    return (
      <main
        className="min-h-screen bg-slate-950 p-4 text-slate-100"
        data-testid="tactical-map-e2e-loading"
      >
        Loading tactical map harness...
      </main>
    );
  }

  return <Harness />;
}
