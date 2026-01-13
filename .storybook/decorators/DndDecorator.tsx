import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Decorator } from '@storybook/react';

export const DndDecorator: Decorator = (Story) => (
  <DndProvider backend={HTML5Backend}>
    <Story />
  </DndProvider>
);
