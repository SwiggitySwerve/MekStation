/**
 * useEventListener Hook Tests
 *
 * TDD tests for the event listener utility hook.
 */

import { renderHook } from '@testing-library/react';

import { useEventListener } from '../useEventListener';

describe('useEventListener', () => {
  // Mock window event methods
  const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

  beforeEach(() => {
    addEventListenerSpy.mockClear();
    removeEventListenerSpy.mockClear();
  });

  afterAll(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('window events', () => {
    it('should add event listener on mount', () => {
      const handler = jest.fn();

      renderHook(() => useEventListener('resize', handler));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
        undefined,
      );
    });

    it('should remove event listener on unmount', () => {
      const handler = jest.fn();

      const { unmount } = renderHook(() => useEventListener('resize', handler));
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
        undefined,
      );
    });

    it('should call handler when event fires', () => {
      const handler = jest.fn();

      renderHook(() => useEventListener('resize', handler));

      // Simulate resize event
      window.dispatchEvent(new Event('resize'));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple event types', () => {
      const onlineHandler = jest.fn();
      const offlineHandler = jest.fn();

      renderHook(() => {
        useEventListener('online', onlineHandler);
        useEventListener('offline', offlineHandler);
      });

      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));

      expect(onlineHandler).toHaveBeenCalledTimes(1);
      expect(offlineHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('document events', () => {
    const docAddSpy = jest.spyOn(document, 'addEventListener');
    const docRemoveSpy = jest.spyOn(document, 'removeEventListener');

    beforeEach(() => {
      docAddSpy.mockClear();
      docRemoveSpy.mockClear();
    });

    afterAll(() => {
      docAddSpy.mockRestore();
      docRemoveSpy.mockRestore();
    });

    it('should add event listener to document', () => {
      const handler = jest.fn();

      renderHook(() =>
        useEventListener('keydown', handler, { target: document }),
      );

      expect(docAddSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        undefined,
      );
    });

    it('should remove event listener from document on unmount', () => {
      const handler = jest.fn();

      const { unmount } = renderHook(() =>
        useEventListener('keydown', handler, { target: document }),
      );
      unmount();

      expect(docRemoveSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        undefined,
      );
    });
  });

  describe('element ref events', () => {
    it('should add event listener to element ref', () => {
      const handler = jest.fn();
      const element = document.createElement('div');
      const addSpy = jest.spyOn(element, 'addEventListener');

      const ref = { current: element };

      renderHook(() => useEventListener('click', handler, { target: ref }));

      expect(addSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        undefined,
      );
    });

    it('should remove event listener from element ref on unmount', () => {
      const handler = jest.fn();
      const element = document.createElement('div');
      const removeSpy = jest.spyOn(element, 'removeEventListener');

      const ref = { current: element };

      const { unmount } = renderHook(() =>
        useEventListener('click', handler, { target: ref }),
      );
      unmount();

      expect(removeSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        undefined,
      );
    });

    it('should handle null ref gracefully', () => {
      const handler = jest.fn();
      const ref = { current: null };

      // Should not throw
      expect(() => {
        renderHook(() => useEventListener('click', handler, { target: ref }));
      }).not.toThrow();
    });

    it('should update listener when target prop changes', () => {
      const handler = jest.fn();
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');
      const add1Spy = jest.spyOn(element1, 'addEventListener');
      const remove1Spy = jest.spyOn(element1, 'removeEventListener');
      const add2Spy = jest.spyOn(element2, 'addEventListener');

      // Start with element1
      let target: HTMLElement = element1;

      const { rerender } = renderHook(
        ({ t }) => useEventListener('click', handler, { target: t }),
        { initialProps: { t: target } },
      );

      expect(add1Spy).toHaveBeenCalled();

      // Change to element2
      target = element2;
      rerender({ t: target });

      expect(remove1Spy).toHaveBeenCalled();
      expect(add2Spy).toHaveBeenCalled();
    });
  });

  describe('handler reference stability', () => {
    it('should use latest handler without re-subscribing', () => {
      let handler = jest.fn();

      const { rerender } = renderHook(() =>
        useEventListener('resize', handler),
      );

      // Verify initial subscription
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

      // Change handler
      const newHandler = jest.fn();
      handler = newHandler;
      rerender();

      // Should NOT add a new listener (handler ref should be stable)
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

      // But new handler should be called
      window.dispatchEvent(new Event('resize'));
      expect(newHandler).toHaveBeenCalled();
    });
  });

  describe('options support', () => {
    it('should pass addEventListener options', () => {
      const handler = jest.fn();

      renderHook(() =>
        useEventListener('scroll', handler, {
          capture: true,
          passive: true,
        }),
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        expect.objectContaining({ capture: true, passive: true }),
      );
    });
  });

  describe('enabled option', () => {
    it('should not add listener when enabled is false', () => {
      const handler = jest.fn();

      renderHook(() => useEventListener('resize', handler, { enabled: false }));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('should add listener when enabled changes to true', () => {
      const handler = jest.fn();
      let enabled = false;

      const { rerender } = renderHook(() =>
        useEventListener('resize', handler, { enabled }),
      );

      expect(addEventListenerSpy).not.toHaveBeenCalled();

      enabled = true;
      rerender();

      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it('should remove listener when enabled changes to false', () => {
      const handler = jest.fn();
      let enabled = true;

      const { rerender } = renderHook(() =>
        useEventListener('resize', handler, { enabled }),
      );

      expect(addEventListenerSpy).toHaveBeenCalled();

      enabled = false;
      rerender();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});
