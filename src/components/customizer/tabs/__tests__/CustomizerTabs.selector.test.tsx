import { fireEvent, render, screen, within } from '@testing-library/react';
import React, { useState } from 'react';

import { createEmptyValidationCounts } from '@/utils/validation/validationNavigation';

import { CustomizerTabs, DEFAULT_CUSTOMIZER_TABS } from '../CustomizerTabs';

function Sections() {
  const [activeTab, setActiveTab] = useState('armor');
  const counts = createEmptyValidationCounts();
  counts.structure.errors = 2;
  counts.equipment.warnings = 1;
  return (
    <>
      <CustomizerTabs
        tabs={DEFAULT_CUSTOMIZER_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        validationCounts={counts}
        compact
      />
      <button type="button">Outside</button>
    </>
  );
}

it('opens all seven full labels, retains validation counts and focuses the selection', () => {
  render(<Sections />);
  const trigger = screen.getByRole('button', {
    name: 'Section: Armor, 3 of 7',
  });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  // Armor owns no issues, so its trigger carries no badge even though other
  // sections do: the totals live in the status row, not here.
  expect(within(trigger).queryByRole('img')).toBeNull();
  expect(trigger).not.toHaveAccessibleDescription();
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(
    screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label')),
  ).toEqual(DEFAULT_CUSTOMIZER_TABS.map((tab) => tab.label));
  expect(screen.getByRole('tab', { name: 'Armor' })).toHaveFocus();
  expect(
    within(screen.getByRole('tab', { name: 'Structure' })).getByRole('img', {
      name: 'Structure: 2 errors',
    }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole('tab', { name: 'Equipment' })).getByRole('img', {
      name: 'Equipment: 1 warning',
    }),
  ).toBeInTheDocument();
});

it.each(DEFAULT_CUSTOMIZER_TABS)(
  'selects $label through the existing callback and returns focus',
  ({ label, id }) => {
    const index = DEFAULT_CUSTOMIZER_TABS.findIndex((tab) => tab.id === id);
    render(<Sections />);
    fireEvent.click(screen.getByRole('button', { name: /^Section:/ }));
    fireEvent.click(screen.getByRole('tab', { name: label }));
    const trigger = screen.getByRole('button', {
      name: `Section: ${label}, ${index + 1} of 7`,
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    // The trigger badges only what the current section owns, like a wide tab.
    const owned = {
      structure: 'Structure: 2 errors',
      equipment: 'Equipment: 1 warning',
    }[id as 'structure' | 'equipment'];
    if (owned) {
      expect(within(trigger).getByRole('img')).toHaveAccessibleName(owned);
      expect(trigger).toHaveAccessibleDescription(owned.split(': ')[1]);
    } else {
      expect(within(trigger).queryByRole('img')).toBeNull();
    }
    expect(screen.getByRole('tab', { name: label })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
);

it('moves keyboard focus through the disclosure and dismisses with Escape', () => {
  render(<Sections />);
  const trigger = screen.getByRole('button', { name: /^Section:/ });
  fireEvent.click(trigger);
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(screen.getByRole('tab', { name: 'Equipment' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  expect(screen.getByRole('tab', { name: 'Preview' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'Home' });
  expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
  expect(screen.getByRole('tab', { name: 'Preview' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});

it('dismisses on outside pointer press without leaving focus in hidden content', () => {
  render(<Sections />);
  const trigger = screen.getByRole('button', { name: /^Section:/ });
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});

it('dismisses when keyboard focus leaves the disclosure', () => {
  render(<Sections />);
  const trigger = screen.getByRole('button', { name: /^Section:/ });
  fireEvent.click(trigger);
  fireEvent.blur(document.activeElement!, {
    relatedTarget: screen.getByRole('button', { name: 'Outside' }),
  });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
