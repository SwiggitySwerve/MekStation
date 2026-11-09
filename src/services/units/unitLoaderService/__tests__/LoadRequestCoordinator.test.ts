import { LoadRequestCoordinator } from '../LoadRequestCoordinator';

it('suppresses only an in-flight duplicate and permits retry after completion', () => {
  const requests = new LoadRequestCoordinator();
  const first = requests.begin('canonical:atlas')!;
  expect(requests.begin('canonical:atlas')).toBeNull();
  requests.finish(first);
  const retry = requests.begin('canonical:atlas')!;
  expect(retry).not.toBe(first);
  expect(requests.isCurrent(retry)).toBe(true);
});

it('keeps the newer source request current when the old request finishes', () => {
  const requests = new LoadRequestCoordinator();
  const old = requests.begin('canonical:atlas')!;
  const next = requests.begin('custom:atlas')!;
  expect(requests.isCurrent(old)).toBe(false);
  requests.finish(old);
  expect(requests.isCurrent(next)).toBe(true);
});

it('invalidates canceled requests even when the same source is requested again', () => {
  const requests = new LoadRequestCoordinator();
  const old = requests.begin('canonical:atlas')!;
  requests.cancel();
  expect(requests.isCurrent(old)).toBe(false);
  const next = requests.begin('canonical:atlas')!;
  requests.finish(old);
  expect(requests.isCurrent(next)).toBe(true);
});

it('releases a canceled source once, after revoking its editor ticket', () => {
  const requests = new LoadRequestCoordinator();
  const release = jest.fn((): void => {
    expect(requests.isCurrent(ticket)).toBe(false);
  });
  const ticket = requests.begin('canonical:atlas', release)!;
  requests.cancel();
  requests.cancel();
  expect(release).toHaveBeenCalledTimes(1);
});

it('releases a replaced source but never a duplicate or completed source', () => {
  const requests = new LoadRequestCoordinator();
  const oldRelease = jest.fn();
  const duplicateRelease = jest.fn();
  const nextRelease = jest.fn();
  const old = requests.begin('canonical:atlas', oldRelease)!;
  expect(requests.begin('canonical:atlas', duplicateRelease)).toBeNull();
  expect(oldRelease).not.toHaveBeenCalled();
  const next = requests.begin('custom:atlas', nextRelease)!;
  expect(oldRelease).toHaveBeenCalledTimes(1);
  requests.finish(old);
  requests.finish(next);
  requests.cancel();
  expect(duplicateRelease).not.toHaveBeenCalled();
  expect(nextRelease).not.toHaveBeenCalled();
});
