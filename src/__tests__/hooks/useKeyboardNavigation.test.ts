import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation, useTabKeyboardNavigation, useFocusOnSelect } from '@/hooks/useKeyboardNavigation';

/**
 * Create a mock KeyboardEvent for testing
 */
function createMockKeyboardEvent(key: string, options?: { preventDefault?: jest.Mock }): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  if (options?.preventDefault) {
    jest.spyOn(event, 'preventDefault').mockImplementation(options.preventDefault);
  }
  return event;
}

/**
 * Create a mock React.KeyboardEvent for testing.
 * We create a plain object that satisfies the React.KeyboardEvent interface.
 */
function createMockReactKeyboardEvent(key: string, options?: { preventDefault?: jest.Mock }): React.KeyboardEvent {
  const nativeEvent = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  
  // Create a mock object that satisfies React.KeyboardEvent interface
  // Using a plain object avoids issues with read-only properties on native events
  const mockPreventDefault = options?.preventDefault ?? jest.fn();
  
  const reactEvent: React.KeyboardEvent = {
    // Native event properties
    key,
    code: nativeEvent.code,
    keyCode: nativeEvent.keyCode,
    charCode: nativeEvent.charCode,
    which: nativeEvent.which,
    altKey: nativeEvent.altKey,
    ctrlKey: nativeEvent.ctrlKey,
    metaKey: nativeEvent.metaKey,
    shiftKey: nativeEvent.shiftKey,
    repeat: nativeEvent.repeat,
    location: nativeEvent.location,
    getModifierState: (key: string) => nativeEvent.getModifierState(key),
    
    // Base event properties
    nativeEvent,
    currentTarget: null as unknown as EventTarget & Element,
    target: null as unknown as EventTarget & Element,
    bubbles: nativeEvent.bubbles,
    cancelable: nativeEvent.cancelable,
    defaultPrevented: nativeEvent.defaultPrevented,
    eventPhase: nativeEvent.eventPhase,
    isTrusted: nativeEvent.isTrusted,
    timeStamp: nativeEvent.timeStamp,
    type: nativeEvent.type,
    
    // React synthetic event methods
    preventDefault: mockPreventDefault,
    stopPropagation: jest.fn(),
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    persist: () => { /* no-op for synthetic events */ },
  } as React.KeyboardEvent;

  return reactEvent;
}

describe('useKeyboardNavigation', () => {
  const items = ['item1', 'item2', 'item3', 'item4'];
  const getKey = (item: string) => item;

  it('should initialize with current index', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect: jest.fn(),
        getKey,
      })
    );

    expect(result.current.currentIndex).toBe(1);
  });

  it('should return -1 when no item is selected', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: null,
        onSelect: jest.fn(),
        getKey,
      })
    );

    expect(result.current.currentIndex).toBe(-1);
  });

  it('should navigate down', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect,
        getKey,
      })
    );

    act(() => {
      result.current.navigate('down');
    });

    expect(onSelect).toHaveBeenCalledWith('item3');
  });

  it('should navigate up', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect,
        getKey,
      })
    );

    act(() => {
      result.current.navigate('up');
    });

    expect(onSelect).toHaveBeenCalledWith('item1');
  });

  it('should navigate to first', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item3',
        onSelect,
        getKey,
      })
    );

    act(() => {
      result.current.navigate('first');
    });

    expect(onSelect).toHaveBeenCalledWith('item1');
  });

  it('should navigate to last', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect,
        getKey,
      })
    );

    act(() => {
      result.current.navigate('last');
    });

    expect(onSelect).toHaveBeenCalledWith('item4');
  });

  it('should wrap around when navigating down at end', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item4',
        onSelect,
        getKey,
        wrap: true,
      })
    );

    act(() => {
      result.current.navigate('down');
    });

    expect(onSelect).toHaveBeenCalledWith('item1');
  });

  it('should not wrap when wrap is false', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item4',
        onSelect,
        getKey,
        wrap: false,
      })
    );

    act(() => {
      result.current.navigate('down');
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should handle grid navigation with columns', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items: ['1', '2', '3', '4', '5', '6'],
        selectedItem: '3',
        onSelect,
        getKey,
        columns: 3,
      })
    );

    act(() => {
      result.current.navigate('down');
    });

    expect(onSelect).toHaveBeenCalledWith('6');
  });

  it('should handle horizontal navigation', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect,
        getKey,
        horizontal: true,
      })
    );

    act(() => {
      result.current.navigate('right');
    });

    expect(onSelect).toHaveBeenCalledWith('item3');
  });

  it('should not navigate when disabled', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect,
        getKey,
        enabled: false,
      })
    );

    act(() => {
      result.current.navigate('down');
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should handle keyboard events', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect,
        getKey,
      })
    );

    const preventDefault = jest.fn();
    const event = createMockKeyboardEvent('ArrowDown', { preventDefault });
    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(onSelect).toHaveBeenCalledWith('item3');
    expect(preventDefault).toHaveBeenCalled();
  });

  it('should activate item on Enter', () => {
    const onSelect = jest.fn();
    const onActivate = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect,
        onActivate,
        getKey,
      })
    );

    const preventDefault = jest.fn();
    const event = createMockKeyboardEvent('Enter', { preventDefault });
    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(onActivate).toHaveBeenCalledWith('item2');
    expect(preventDefault).toHaveBeenCalled();
  });

  it('should activate item on Space', () => {
    const onSelect = jest.fn();
    const onActivate = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        items,
        selectedItem: 'item2',
        onSelect,
        onActivate,
        getKey,
      })
    );

    const preventDefault = jest.fn();
    const event = createMockKeyboardEvent(' ', { preventDefault });
    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(onActivate).toHaveBeenCalledWith('item2');
    expect(preventDefault).toHaveBeenCalled();
  });
});

describe('useTabKeyboardNavigation', () => {
  const tabs = [{ id: 'tab1' }, { id: 'tab2' }, { id: 'tab3' }];
  const onTabChange = jest.fn();

  beforeEach(() => {
    onTabChange.mockClear();
  });

  it('should navigate left', () => {
    const { result } = renderHook(() =>
      useTabKeyboardNavigation(tabs, 'tab2', onTabChange)
    );

    const preventDefault = jest.fn();
    const event = createMockReactKeyboardEvent('ArrowLeft', { preventDefault });
    act(() => {
      result.current(event);
    });

    expect(onTabChange).toHaveBeenCalledWith('tab1');
    expect(preventDefault).toHaveBeenCalled();
  });

  it('should navigate right', () => {
    const { result } = renderHook(() =>
      useTabKeyboardNavigation(tabs, 'tab2', onTabChange)
    );

    const preventDefault = jest.fn();
    const event = createMockReactKeyboardEvent('ArrowRight', { preventDefault });
    act(() => {
      result.current(event);
    });

    expect(onTabChange).toHaveBeenCalledWith('tab3');
  });

  it('should wrap to last tab when navigating left from first', () => {
    const { result } = renderHook(() =>
      useTabKeyboardNavigation(tabs, 'tab1', onTabChange)
    );

    const preventDefault = jest.fn();
    const event = createMockReactKeyboardEvent('ArrowLeft', { preventDefault });
    act(() => {
      result.current(event);
    });

    expect(onTabChange).toHaveBeenCalledWith('tab3');
  });

  it('should wrap to first tab when navigating right from last', () => {
    const { result } = renderHook(() =>
      useTabKeyboardNavigation(tabs, 'tab3', onTabChange)
    );

    const preventDefault = jest.fn();
    const event = createMockReactKeyboardEvent('ArrowRight', { preventDefault });
    act(() => {
      result.current(event);
    });

    expect(onTabChange).toHaveBeenCalledWith('tab1');
  });

  it('should navigate to first tab on Home', () => {
    const { result } = renderHook(() =>
      useTabKeyboardNavigation(tabs, 'tab2', onTabChange)
    );

    const preventDefault = jest.fn();
    const event = createMockReactKeyboardEvent('Home', { preventDefault });
    act(() => {
      result.current(event);
    });

    expect(onTabChange).toHaveBeenCalledWith('tab1');
  });

  it('should navigate to last tab on End', () => {
    const { result } = renderHook(() =>
      useTabKeyboardNavigation(tabs, 'tab2', onTabChange)
    );

    const preventDefault = jest.fn();
    const event = createMockReactKeyboardEvent('End', { preventDefault });
    act(() => {
      result.current(event);
    });

    expect(onTabChange).toHaveBeenCalledWith('tab3');
  });

  it('should not navigate if active tab not found', () => {
    const { result } = renderHook(() =>
      useTabKeyboardNavigation(tabs, 'nonexistent', onTabChange)
    );

    const preventDefault = jest.fn();
    const event = createMockReactKeyboardEvent('ArrowRight', { preventDefault });
    act(() => {
      result.current(event);
    });

    expect(onTabChange).not.toHaveBeenCalled();
  });
});

describe('useFocusOnSelect', () => {
  it('should focus element when selected', () => {
    const ref = { current: document.createElement('button') };
    const focusSpy = jest.spyOn(ref.current, 'focus');

    const { rerender } = renderHook(
      ({ isSelected }) => useFocusOnSelect(ref, isSelected),
      { initialProps: { isSelected: false } }
    );

    expect(focusSpy).not.toHaveBeenCalled();

    rerender({ isSelected: true });

    expect(focusSpy).toHaveBeenCalled();
  });

  it('should not focus if ref is null', () => {
    const ref = { current: null };
    
    expect(() => {
      renderHook(() => useFocusOnSelect(ref, true));
    }).not.toThrow();
  });
});

