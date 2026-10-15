describe('initializeE2EStores', () => {
  const originalE2EMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const loadExposure = jest.fn();
  const exposeStoresForE2E = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    loadExposure.mockReset();
    exposeStoresForE2E.mockReset();
    jest.doMock('../e2e/storeExposure', () => {
      loadExposure();
      return { exposeStoresForE2E };
    });
  });

  afterAll(() => {
    if (originalE2EMode === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_MODE;
    } else {
      process.env.NEXT_PUBLIC_E2E_MODE = originalE2EMode;
    }
  });

  it.each([undefined, 'false'])(
    'does not load E2E stores when mode is %s',
    async (mode) => {
      if (mode === undefined) {
        delete process.env.NEXT_PUBLIC_E2E_MODE;
      } else {
        process.env.NEXT_PUBLIC_E2E_MODE = mode;
      }
      const { initializeE2EStores } = await import('../initializeE2EStores');

      await initializeE2EStores();

      expect(loadExposure).not.toHaveBeenCalled();
      expect(exposeStoresForE2E).not.toHaveBeenCalled();
    },
  );

  it('loads and exposes stores when E2E mode is enabled', async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    const { initializeE2EStores } = await import('../initializeE2EStores');

    await initializeE2EStores();

    expect(loadExposure).toHaveBeenCalledTimes(1);
    expect(exposeStoresForE2E).toHaveBeenCalledTimes(1);
  });

  it('rejects when store initialization fails', async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    const failure = new Error('store initialization failed');
    exposeStoresForE2E.mockImplementation(() => {
      throw failure;
    });
    const { initializeE2EStores } = await import('../initializeE2EStores');

    await expect(initializeE2EStores()).rejects.toBe(failure);
  });
});
