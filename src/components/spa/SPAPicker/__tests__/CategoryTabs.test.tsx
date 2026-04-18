/**
 * CategoryTabs — keyboard navigation + selection contract tests.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { CategoryTabs, type CategoryTabId } from '../CategoryTabs';

const categories = ['gunnery', 'piloting', 'edge'];
const counts: Record<CategoryTabId, number> = {
  all: 10,
  gunnery: 4,
  piloting: 5,
  edge: 1,
};

describe('CategoryTabs', () => {
  it('renders one tab per category plus an "All" tab', () => {
    render(
      <CategoryTabs
        categories={categories}
        counts={counts}
        selected="all"
        onSelect={jest.fn()}
      />,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(categories.length + 1);
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('emits onSelect when a tab is clicked', () => {
    const onSelect = jest.fn();
    render(
      <CategoryTabs
        categories={categories}
        counts={counts}
        selected="all"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Gunnery/ }));
    expect(onSelect).toHaveBeenCalledWith('gunnery');
  });

  it('cycles selection with ArrowRight / ArrowLeft', () => {
    const onSelect = jest.fn();
    render(
      <CategoryTabs
        categories={categories}
        counts={counts}
        selected="all"
        onSelect={onSelect}
      />,
    );
    const allTab = screen.getByRole('tab', { name: /All/ });
    fireEvent.keyDown(allTab, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenLastCalledWith('gunnery');
    fireEvent.keyDown(allTab, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenLastCalledWith('edge');
  });

  it('Home / End jump to ends', () => {
    const onSelect = jest.fn();
    render(
      <CategoryTabs
        categories={categories}
        counts={counts}
        selected="gunnery"
        onSelect={onSelect}
      />,
    );
    const gunneryTab = screen.getByRole('tab', { name: /Gunnery/ });
    fireEvent.keyDown(gunneryTab, { key: 'End' });
    expect(onSelect).toHaveBeenLastCalledWith('edge');
    fireEvent.keyDown(gunneryTab, { key: 'Home' });
    expect(onSelect).toHaveBeenLastCalledWith('all');
  });

  it('shows the count badge for each tab', () => {
    render(
      <CategoryTabs
        categories={categories}
        counts={counts}
        selected="all"
        onSelect={jest.fn()}
      />,
    );
    const gunneryTab = screen.getByRole('tab', { name: /Gunnery/ });
    expect(gunneryTab.textContent).toContain('4');
  });
});
