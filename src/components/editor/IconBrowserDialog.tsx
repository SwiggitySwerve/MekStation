import React, { useState, useEffect } from 'react';
import { getIconCache } from '../../utils/iconCache';

interface IconBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconData: string) => void;
}

export const IconBrowserDialog: React.FC<IconBrowserDialogProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [icons, setIcons] = useState<Array<{ id: string; name: string; data: string; tags?: string[] }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cache = getIconCache();
      const allIcons = cache.getAllIcons();
      setIcons(allIcons);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Get all unique tags
  const allTags = Array.from(new Set(icons.flatMap(icon => icon.tags || [])));

  // Filter icons based on search and tag
  const filteredIcons = icons.filter(icon => {
    const matchesSearch = !searchTerm || 
      icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      icon.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = !selectedTag || icon.tags?.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const handleSelect = () => {
    if (selectedIcon) {
      const icon = icons.find(i => i.id === selectedIcon);
      if (icon) {
        onSelect(icon.data);
        onClose();
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this icon from cache?')) {
      const cache = getIconCache();
      cache.removeIcon(id);
      setIcons(icons.filter(i => i.id !== id));
      if (selectedIcon === id) {
        setSelectedIcon(null);
      }
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear all icons from cache? This cannot be undone.')) {
      const cache = getIconCache();
      // Remove all icons one by one since there's no clear method
      icons.forEach(icon => cache.removeIcon(icon.id));
      setIcons([]);
      setSelectedIcon(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Icon Browser</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            
            <button
              onClick={handleClearCache}
              className="px-4 py-2 text-red-600 hover:text-red-700"
            >
              Clear Cache
            </button>
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            {filteredIcons.length} of {icons.length} icons • 
            Cache size: {(localStorage.getItem('iconCache')?.length || 0) / 1024 / 1024} MB
          </div>
        </div>

        {/* Icon Grid */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
          {filteredIcons.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {icons.length === 0 ? 'No icons in cache' : 'No icons match your search'}
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {filteredIcons.map(icon => (
                <div
                  key={icon.name}
                  onClick={() => setSelectedIcon(icon.id)}
                  className={`relative group cursor-pointer rounded-lg border-2 p-2 transition-all ${
                    selectedIcon === icon.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img 
                    src={icon.data} 
                    alt={icon.name}
                    className="w-full h-24 object-contain"
                  />
                  <div className="mt-1 text-xs text-center truncate">{icon.name}</div>
                  
                  {/* Tags */}
                  {icon.tags && icon.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 justify-center">
                      {icon.tags.slice(0, 2).map(tag => (
                        <span 
                          key={tag}
                          className="text-xs px-1 py-0.5 bg-gray-200 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {icon.tags.length > 2 && (
                        <span className="text-xs text-gray-500">+{icon.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(icon.id);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedIcon && `Selected: ${icons.find(i => i.id === selectedIcon)?.name}`}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedIcon}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Select Icon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconBrowserDialog;
