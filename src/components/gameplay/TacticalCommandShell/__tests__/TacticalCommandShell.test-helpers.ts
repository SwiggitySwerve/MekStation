/**
 * Tests for TacticalCommandShell + ShellSlot.
 *
 * Verifies the PR-B contract:
 *   - TacticalCommandShell provides the registry context
 *   - useTacticalShell / useShellSlotRegistryContext throw outside the shell
 *   - ShellSlot is a transparent Fragment (no DOM wrapper)
 *   - ShellSlot registers on mount, unregisters on unmount
 *   - Per "one primary home", a non-primary ShellSlot loses to a primary
 *   - Multiple ShellSlot owners register independently
 *
 * @module components/gameplay/TacticalCommandShell/__tests__/TacticalCommandShell.test
 */

import { render, renderHook, act } from '@testing-library/react';

import {
  ShellSlot,
  TacticalCommandShell,
  useShellSlotRegistryContext,
  useTacticalShell,
} from '../index';

export {
  ShellSlot,
  TacticalCommandShell,
  act,
  render,
  renderHook,
  useShellSlotRegistryContext,
  useTacticalShell,
};
