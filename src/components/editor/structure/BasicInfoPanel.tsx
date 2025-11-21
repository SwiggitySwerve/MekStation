import React, { useCallback, useState } from 'react';
import { EditableUnit } from '../../../types/editor';
import { 
  getIconCache, 
  fileToBase64, 
  resizeImage, 
  validateImageData,
  getSuggestedTags 
} from '../../../utils/iconCache';
import IconBrowserDialog from '../IconBrowserDialog';

interface BasicInfoPanelProps {
  unit: EditableUnit;
  onUnitChange: (unit: EditableUnit) => void;
  readOnly?: boolean;
}

const BasicInfoPanel: React.FC<BasicInfoPanelProps> = ({
  unit,
  onUnitChange,
  readOnly = false,
}) => {
  const [iconPreview, setIconPreview] = useState<string | null>(unit.data?.icon || null);
  const [showIconBrowser, setShowIconBrowser] = useState(false);

  // Handle text field changes
  const handleFieldChange = useCallback((field: string, value: string | number) => {
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        [field]: value,
      },
    };
    
    // Special handling for certain fields
    if (field === 'chassis') {
      updatedUnit.chassis = value as string;
    } else if (field === 'model') {
      updatedUnit.model = value as string;
    } else if (field === 'tech_base') {
      updatedUnit.tech_base = value as string;
    } else if (field === 'era') {
      updatedUnit.era = value as string;
    }
    
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  // Handle icon upload
  const handleIconUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      // Convert to base64
      const base64 = await fileToBase64(file);
      
      // Validate image
      if (!validateImageData(base64)) {
        alert('Invalid image format. Please use PNG, JPG, GIF, or WebP.');
        return;
      }
      
      // Resize to standard icon size
      const resized = await resizeImage(base64);
      
      // Add to cache
      const cache = getIconCache();
      const tags = getSuggestedTags(unit);
      cache.addIcon(unit.chassis || 'Unknown', resized, tags);
      
      // Update preview and unit
      setIconPreview(resized);
      
      const updatedUnit = {
        ...unit,
        data: {
          ...unit.data,
          icon: resized,
        },
      };
      
      onUnitChange(updatedUnit);
    } catch (error) {
      console.error('Failed to upload icon:', error);
      alert('Failed to upload icon. Please try again.');
    }
  }, [unit, onUnitChange]);

  // Remove icon
  const handleRemoveIcon = useCallback(() => {
    setIconPreview(null);
    
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        icon: undefined,
      },
    };
    
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  // Handle import from cache
  const handleImportFromCache = useCallback(() => {
    setShowIconBrowser(true);
  }, []);

  // Handle icon selection from browser
  const handleIconSelect = useCallback((iconData: string) => {
    setIconPreview(iconData);
    
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        icon: iconData,
      },
    };
    
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  return (
    <div className="basic-info-panel bg-white rounded-lg border border-gray-300 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h3>
      
      <div className="space-y-3">
        {/* Chassis */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Chassis:</label>
          <input
            type="text"
            value={unit.chassis || 'New'}
            onChange={(e) => handleFieldChange('chassis', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          />
        </div>

        {/* Clan Name */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Clan Name:</label>
          <input
            type="text"
            value={unit.data?.clan_name || ''}
            onChange={(e) => handleFieldChange('clan_name', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
            placeholder="Optional"
          />
        </div>

        {/* Model */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Model:</label>
          <input
            type="text"
            value={unit.model || 'Mek'}
            onChange={(e) => handleFieldChange('model', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          />
        </div>

        {/* MUL ID */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">MUL ID:</label>
          <input
            type="text"
            value={unit.mul_id || '-1'}
            onChange={(e) => handleFieldChange('mul_id', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
            pattern="-?\d+"
          />
        </div>

        {/* Year */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Year:</label>
          <input
            type="number"
            value={parseInt(unit.era || '3145')}
            onChange={(e) => handleFieldChange('era', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
            min={2000}
            max={3200}
          />
        </div>

        {/* Source/Era */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Source/Era:</label>
          <input
            type="text"
            value={unit.data?.source_era || ''}
            onChange={(e) => handleFieldChange('source_era', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
            placeholder="e.g., TRO:3025"
          />
        </div>

        {/* Tech Base */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Tech Base:</label>
          <select
            value={unit.tech_base || 'Inner Sphere'}
            onChange={(e) => handleFieldChange('tech_base', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="Inner Sphere">Inner Sphere</option>
            <option value="Clan">Clan</option>
            <option value="Mixed (IS Chassis)">Mixed (IS Chassis)</option>
            <option value="Mixed (Clan Chassis)">Mixed (Clan Chassis)</option>
          </select>
        </div>

        {/* Tech Level */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Tech Level:</label>
          <select
            value={unit.rules_level || 'Standard'}
            onChange={(e) => handleFieldChange('rules_level', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="Introductory">Introductory</option>
            <option value="Standard">Standard</option>
            <option value="Advanced">Advanced</option>
            <option value="Experimental">Experimental</option>
          </select>
        </div>

        {/* Manual BV */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Manual BV:</label>
          <input
            type="number"
            value={unit.data?.manual_bv || ''}
            onChange={(e) => handleFieldChange('manual_bv', parseInt(e.target.value) || 0)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
            placeholder="Optional"
            min={0}
          />
        </div>

        {/* Role */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Role:</label>
          <select
            value={unit.role || ''}
            onChange={(e) => handleFieldChange('role', e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="">-</option>
            <option value="Ambusher">Ambusher</option>
            <option value="Brawler">Brawler</option>
            <option value="Juggernaut">Juggernaut</option>
            <option value="Missile Boat">Missile Boat</option>
            <option value="Scout">Scout</option>
            <option value="Skirmisher">Skirmisher</option>
            <option value="Sniper">Sniper</option>
            <option value="Striker">Striker</option>
          </select>
        </div>

        {/* Icon Section */}
        <div className="pt-3 border-t border-gray-200">
          <label className="text-xs font-medium text-gray-700 block mb-2">Icon</label>
          <div className="flex items-center space-x-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleIconUpload}
                disabled={readOnly}
                className="hidden"
              />
              <span className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300">
                Choose file
              </span>
            </label>
            
            <button
              onClick={() => handleImportFromCache()}
              disabled={readOnly}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
            >
              Import from cache
            </button>
            
            {iconPreview && (
              <button
                onClick={handleRemoveIcon}
                disabled={readOnly}
                className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 rounded border border-red-300 text-red-700"
              >
                Remove
              </button>
            )}
          </div>
          
          {/* Icon Preview */}
          {iconPreview && (
            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
              <img 
                src={iconPreview} 
                alt="Unit icon" 
                className="h-16 w-16 object-contain mx-auto"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Icon Browser Dialog */}
      <IconBrowserDialog
        isOpen={showIconBrowser}
        onClose={() => setShowIconBrowser(false)}
        onSelect={handleIconSelect}
      />
    </div>
  );
};

export default BasicInfoPanel;
