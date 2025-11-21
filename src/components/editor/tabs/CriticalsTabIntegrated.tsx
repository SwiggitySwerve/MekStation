/**
 * Critical Slots Tab Placeholder
 * Temporary placeholder until the v2 critical slots system is fully integrated
 */

import React from 'react';
import { EditorComponentProps } from '../../../types/editor';

interface CriticalsTabIntegratedProps extends EditorComponentProps {
  readOnly?: boolean;
}

const CriticalsTabIntegrated: React.FC<CriticalsTabIntegratedProps> = ({
  readOnly = false
}) => {
  return (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Critical Slots</h3>
        <p className="text-sm text-gray-500 mb-4">
          The integrated critical slots editor has been temporarily disabled due to technical conflicts.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Use the <strong>Customizer V2</strong> page for full critical slots functionality with the latest improvements.
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => window.open('/customizer-v2', '_blank')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Open Customizer V2
            <svg className="ml-2 -mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default CriticalsTabIntegrated;
