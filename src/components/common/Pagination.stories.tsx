import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import Pagination from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Common/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: () => {},
  },
};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    onPageChange: () => {},
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
    onPageChange: () => {},
  },
};

const InteractiveExample = () => {
  const [page, setPage] = useState(1);
  return (
    <div className="space-y-4">
      <Pagination currentPage={page} totalPages={10} onPageChange={setPage} />
      <p className="text-text-theme-secondary text-center text-sm">
        Current page: <span className="text-accent font-medium">{page}</span>
      </p>
    </div>
  );
};

export const Interactive: StoryObj = {
  render: () => <InteractiveExample />,
};
