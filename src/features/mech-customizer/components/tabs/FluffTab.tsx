'use client';

import React from 'react';
import { useCustomizerStore } from '../../store/useCustomizerStore';

export const FluffTab: React.FC = () => {
  const unit = useCustomizerStore(state => state.unit);
  const updateUnit = useCustomizerStore(state => state.updateUnit);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div>
          <label className="text-xs uppercase text-slate-400 block mb-2">Chassis Name</label>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            value={unit.name}
            onChange={event => updateUnit({ name: event.target.value })}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-400 block mb-2">Model</label>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            value={unit.model}
            onChange={event => updateUnit({ model: event.target.value })}
          />
        </div>
        <div className="text-sm text-slate-400 bg-slate-800/60 rounded p-3">
          <p className="text-slate-300 font-semibold mb-1">Narrative Metadata</p>
          <p>
            Fluff editing will store variant notes, notable pilots, and deployment history. The new
            project keeps this tab reserved so we can wire storage once the data contract is ready.
          </p>
        </div>
      </section>
    </div>
  );
};

