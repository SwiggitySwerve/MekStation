export async function initializeE2EStores(): Promise<void> {
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return;

  const { exposeStoresForE2E } = await import('./e2e/storeExposure');
  exposeStoresForE2E();
}
