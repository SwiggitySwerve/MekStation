'use client';

import React from 'react';
import { PaperDoll } from '../../../mech-lab/components/panels/PaperDoll';
import { useCustomizerViewModel } from '../../store/useCustomizerStore';

export const CriticalsTab: React.FC = () => {
  const { unit, actions } = useCustomizerViewModel();

  return (
    <div className="space-y-6">
      <PaperDoll state={unit} actions={actions} />
    </div>
  );
};

