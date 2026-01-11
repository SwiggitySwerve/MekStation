// src/stores/__tests__/useAppSettingsStore.armorMode.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAppSettingsStore } from '../useAppSettingsStore';

describe('useAppSettingsStore - armorDiagramMode', () => {
  beforeEach(() => {
    act(() => {
      useAppSettingsStore.getState().resetToDefaults();
    });
  });

  it('should have silhouette as default armor diagram mode', () => {
    const { result } = renderHook(() => useAppSettingsStore());
    expect(result.current.armorDiagramMode).toBe('silhouette');
  });

  it('should update armor diagram mode', () => {
    const { result } = renderHook(() => useAppSettingsStore());
    act(() => {
      result.current.setArmorDiagramMode('schematic');
    });
    expect(result.current.armorDiagramMode).toBe('schematic');
  });

  it('should persist armor diagram mode', () => {
    const { result } = renderHook(() => useAppSettingsStore());
    act(() => {
      result.current.setArmorDiagramMode('schematic');
    });
    const state = useAppSettingsStore.getState();
    expect(state.armorDiagramMode).toBe('schematic');
  });
});
