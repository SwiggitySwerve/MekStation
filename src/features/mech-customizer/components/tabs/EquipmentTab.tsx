'use client';

import React from 'react';
import { EquipmentPanel } from '../../../mech-lab/components/panels/EquipmentPanel';
import { ExportPanel } from '../../../mech-lab/components/panels/ExportPanel';
import { useCustomizerViewModel } from '../../store/useCustomizerStore';

export const EquipmentTab: React.FC = () => {
  const { unit, metrics, actions } = useCustomizerViewModel();

  return (
    <div className="space-y-6">
      <EquipmentPanel state={unit} actions={actions} />
      <ExportPanel state={unit} metrics={metrics} />
    </div>
  );
};

