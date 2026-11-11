/**
 * Side-effect module for the runtime-parity Jest captures: it installs the browser globals and the three
 * jest mocks the status-bar observation needs. status-observer.js imports it FIRST, and ES imports evaluate
 * in source order, so by the time any product module is imported the mocks are registered. That is the
 * whole ordering rule; there is no call to remember to make and nothing here is order-dependent otherwise.
 *
 * `probe` and `toasts` are shared with the observer: the calculator spy writes `probe.bv`, the Toast mock
 * writes `toasts`.
 */
import { TextEncoder, TextDecoder } from 'util';

export const probe = { bv: null, status: null };
export const toasts = [];

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});

jest.mock('@/utils/logger', () => ({
  logger: Object.fromEntries(
    ['debug', 'info', 'warn', 'error', 'log'].map((k) => [k, jest.fn()]),
  ),
}));
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: (value) => toasts.push(value) }),
}));
// Observe the real calculator's result or exception without changing either. The status bar shows
// 0 when the calculation fails or the registry is not ready; this probe is how that is told from a BV.
jest.mock('@/utils/construction/mechBV/calculator', () => {
  const actual = jest.requireActual('@/utils/construction/mechBV/calculator');
  return {
    ...actual,
    calculateUnitBV(...args) {
      try {
        const result = actual.calculateUnitBV.apply(this, args);
        probe.bv = { result, error: null };
        return result;
      } catch (error) {
        probe.bv = { result: null, error };
        throw error;
      }
    },
  };
});
