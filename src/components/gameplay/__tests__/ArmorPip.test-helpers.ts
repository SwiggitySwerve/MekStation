import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { useHaptics } from '@/hooks/useHaptics';

import type { PipState } from '../ArmorPip';

import { ArmorPip, ArmorPipGroup } from '../ArmorPip';

// Mock haptic feedback
jest.mock('@/hooks/useHaptics');

const mockVibrateCustom = jest.fn();
const mockUseHaptics = useHaptics as jest.MockedFunction<typeof useHaptics>;

beforeEach(() => {
  mockUseHaptics.mockReturnValue({
    vibrate: jest.fn(),
    vibrateCustom: mockVibrateCustom,
    cancel: jest.fn(),
    isSupported: true,
  });
});

export {
  ArmorPip,
  ArmorPipGroup,
  React,
  fireEvent,
  mockUseHaptics,
  mockVibrateCustom,
  render,
  screen,
  useHaptics,
};

export type { PipState };
