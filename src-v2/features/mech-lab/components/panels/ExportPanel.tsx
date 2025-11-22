/**
 * ExportPanel.tsx
 * UI Panel for exporting the Mech design.
 */

import React from 'react';
import { useMechLabStore } from '../../hooks/useMechLabStore';

export const ExportPanel: React.FC = () => {
  const { state, metrics } = useMechLabStore();

  const handleExport = () => {
    const exportData = {
      ...state,
      _meta: {
        exportedAt: new Date().toISOString(),
        metrics,
        version: '2.0.0-alpha'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.name.replace(/\s+/g, '_')}_${state.model}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-blue-300">Export Design</h2>
          <p className="text-xs text-gray-400">Save your configuration to a JSON file.</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download JSON
        </button>
      </div>
    </section>
  );
};

