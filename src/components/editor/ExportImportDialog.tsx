import React, { useState, useRef } from 'react';
import { EditableUnit } from '../../types/editor';
import { 
  exportToJSON, 
  exportToMTF, 
  importFromJSON, 
  importFromMTF, 
  downloadUnit,
  readUploadedFile 
} from '../../utils/unitExportImportProper';

interface ExportImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  unit?: EditableUnit;
  onImport?: (unit: EditableUnit) => void;
  mode: 'export' | 'import';
}

export const ExportImportDialog: React.FC<ExportImportDialogProps> = ({
  isOpen,
  onClose,
  unit,
  onImport,
  mode
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'mtf'>('json');
  const [importContent, setImportContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    if (!unit) return;
    
    try {
      downloadUnit(unit, activeTab);
      onClose();
    } catch (err) {
      setError(`Export failed: ${err}`);
    }
  };

  const handleImport = async () => {
    if (!importContent || !onImport) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let importedUnit: EditableUnit;
      
      if (activeTab === 'json') {
        importedUnit = importFromJSON(importContent);
      } else {
        importedUnit = importFromMTF(importContent);
      }
      
      onImport(importedUnit);
      onClose();
    } catch (err) {
      setError(`Import failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const unit = await readUploadedFile(file);
      if (onImport) {
        onImport(unit);
        onClose();
      }
    } catch (err) {
      setError(`File read failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getExportContent = () => {
    if (!unit) return '';
    
    try {
      return activeTab === 'json' 
        ? exportToJSON(unit)
        : exportToMTF(unit);
    } catch (err) {
      return `Error generating export: ${err}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {mode === 'export' ? 'Export Unit' : 'Import Unit'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('json')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'json'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              JSON Format
            </button>
            <button
              onClick={() => setActiveTab('mtf')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'mtf'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              MTF Format (MegaMekLab)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {mode === 'export' ? (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {activeTab === 'json' 
                    ? 'JSON format preserves all editor data and is recommended for backup.'
                    : 'MTF format is compatible with MegaMekLab but may lose some editor-specific data.'}
                </p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {getExportContent()}
                </pre>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Paste your {activeTab.toUpperCase()} content below or upload a file.
                </p>
                
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Upload File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeTab === 'json' ? '.json' : '.mtf'}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
              
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder={`Paste ${activeTab.toUpperCase()} content here...`}
                className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          
          {mode === 'export' ? (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Download {activeTab.toUpperCase()}
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={!importContent || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportImportDialog;
