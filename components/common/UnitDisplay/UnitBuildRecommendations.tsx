import React from 'react';
import { BuildRecommendation } from '../../../types/unitDisplay';

interface UnitBuildRecommendationsProps {
  recommendations: BuildRecommendation[];
  compact?: boolean;
  onRecommendationAction?: (recommendationId: string, action: string) => void;
}

const UnitBuildRecommendations: React.FC<UnitBuildRecommendationsProps> = ({ 
  recommendations, 
  compact = false,
  onRecommendationAction
}) => {
  if (recommendations.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: BuildRecommendation['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-400 bg-red-50';
      case 'medium': return 'border-yellow-400 bg-yellow-50';
      case 'low': return 'border-blue-400 bg-blue-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: BuildRecommendation['priority']) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  if (compact) {
    const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">Recommendations</h4>
          <div className="text-sm">
            <span className="font-medium">{recommendations.length} total</span>
            {highPriorityCount > 0 && (
              <span className="text-red-600 ml-2">({highPriorityCount} high priority)</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Build Recommendations</h3>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {recommendations.map((recommendation) => (
          <div 
            key={recommendation.id} 
            className={`p-3 border rounded ${getPriorityColor(recommendation.priority)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1">
                <span className="text-lg">{getPriorityIcon(recommendation.priority)}</span>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{recommendation.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                  
                  {recommendation.suggestedActions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Suggested Actions:</p>
                      <ul className="text-xs text-gray-600 mt-1 space-y-1">
                        {recommendation.suggestedActions.map((action, index) => (
                          <li key={index} className="flex items-center">
                            <span className="mr-1">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              {recommendation.autoApplyable && onRecommendationAction && (
                <button
                  onClick={() => onRecommendationAction(recommendation.id, 'auto-apply')}
                  className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Auto-apply this recommendation"
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnitBuildRecommendations;
