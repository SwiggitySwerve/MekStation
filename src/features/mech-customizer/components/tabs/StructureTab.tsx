'use client';

import React from 'react';
import { StructurePanel } from '../../../mech-lab/components/panels/StructurePanel';
import { EnginePanel } from '../../../mech-lab/components/panels/EnginePanel';
import { useCustomizerViewModel } from '../../store/useCustomizerStore';

export const StructureTab: React.FC = () => {
  const { unit, metrics, actions } = useCustomizerViewModel();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StructurePanel state={unit} actions={actions} />
      <EnginePanel state={unit} metrics={metrics} actions={actions} />
    </div>
  );
};

