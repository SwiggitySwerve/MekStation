import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { UnitFilterState } from './UnitFilters';

interface Unit {
  id: number;
  chassis: string;
  model: string;
  mass: number;
  tech_base: string;
  era: string;
  source: string;
  type: string;
  role?: string;
  is_omnimech?: boolean;
  omnimech_base_chassis?: string;
  omnimech_configuration?: string;
  config?: string;
  validation_status?: 'valid' | 'warning' | 'error';
  validation_messages?: string[];
}

interface ApiResponse {
  items: Unit[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

interface UnitCompendiumListProps {
  filters: UnitFilterState;
  selectedCategory?: string | null;
}

const UnitCompendiumList: React.FC<UnitCompendiumListProps> = ({ filters, selectedCategory }) => {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('chassis');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const fetchUnits = async (page: number = 1) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });

      // Add filters to params
      if (filters.searchTerm) params.append('q', filters.searchTerm);
      if (filters.techBase) params.append('techBase', filters.techBase);
      if (filters.weightClass) params.append('weight_class', filters.weightClass);
      if (filters.hasQuirk) params.append('has_quirk', filters.hasQuirk);
      if (filters.startYear) params.append('startYear', filters.startYear);
      if (filters.endYear) params.append('endYear', filters.endYear);
      if (filters.isOmnimech !== undefined) params.append('isOmnimech', filters.isOmnimech.toString());
      if (filters.config) params.append('config', filters.config);
      if (filters.role) params.append('role', filters.role);
      
      // Add category filter (API expects unit_type parameter)
      if (selectedCategory) params.append('unit_type', selectedCategory);

      const response = await fetch(`/api/units?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch units: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      setUnits(data.items);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching units:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits(1);
  }, [filters, selectedCategory, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const handlePageChange = (page: number) => {
    fetchUnits(page);
  };

  const handleUnitClick = (unitId: number) => {
    router.push(`/units/${unitId}`);
  };

  const getValidationBadge = (status?: string) => {
    if (!status) return null;
    
    const badgeClasses = {
      valid: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800', 
      error: 'bg-red-100 text-red-800'
    };

    const icons = {
      valid: '✓',
      warning: '⚠',
      error: '✗'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClasses[status as keyof typeof badgeClasses]}`}>
        {icons[status as keyof typeof icons]} {status}
      </span>
    );
  };

  const getTechBaseBadge = (techBase: string) => {
    const badgeClasses = {
      'Inner Sphere': 'bg-blue-100 text-blue-800',
      'Clan': 'bg-red-100 text-red-800',
      'Mixed (IS Chassis)': 'bg-purple-100 text-purple-800',
      'Mixed (Clan Chassis)': 'bg-pink-100 text-pink-800'
    };

    const shortNames = {
      'Inner Sphere': 'IS',
      'Clan': 'Clan',
      'Mixed (IS Chassis)': 'Mixed IS',
      'Mixed (Clan Chassis)': 'Mixed Clan'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClasses[techBase as keyof typeof badgeClasses] || 'bg-gray-100 text-gray-800'}`}>
        {shortNames[techBase as keyof typeof shortNames] || techBase}
      </span>
    );
  };

  const getOmniMechBadge = (isOmnimech?: boolean, configuration?: string) => {
    if (!isOmnimech) return null;
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        OmniMech {configuration && `(${configuration})`}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading units...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading units</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="navy-section">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Units ({totalItems} found)
        </h2>
      </div>

      {units.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No units found matching your criteria.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('chassis')}
                  >
                    Chassis {sortBy === 'chassis' && (sortOrder === 'ASC' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('model')}
                  >
                    Model {sortBy === 'model' && (sortOrder === 'ASC' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('mass')}
                  >
                    Mass {sortBy === 'mass' && (sortOrder === 'ASC' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('tech_base')}
                  >
                    Tech Base {sortBy === 'tech_base' && (sortOrder === 'ASC' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('role')}
                  >
                    Role {sortBy === 'role' && (sortOrder === 'ASC' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('era')}
                  >
                    Era {sortBy === 'era' && (sortOrder === 'ASC' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {units.map((unit) => (
                  <tr 
                    key={unit.id} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                    onClick={() => handleUnitClick(unit.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {unit.chassis}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.mass}t
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col space-y-1">
                        {getTechBaseBadge(unit.tech_base)}
                        {getOmniMechBadge(unit.is_omnimech, unit.omnimech_configuration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.role || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.era}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col space-y-1">
                        {getValidationBadge(unit.validation_status)}
                        {unit.validation_messages && unit.validation_messages.length > 0 && (
                          <div className="text-xs text-gray-500" title={unit.validation_messages.join(', ')}>
                            {unit.validation_messages.length} message{unit.validation_messages.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span> ({totalItems} total)
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UnitCompendiumList;
