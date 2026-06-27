/**
 * Unit Comparison Page
 * Compare multiple units side-by-side.
 */
import { useEffect, useState, useCallback } from 'react';

import {
  ComparisonGrid,
  CompareSearchResults,
  CompareSlotsHint,
} from '@/components/pages/compare/ComparePage.components';
import { PageLayout, Input } from '@/components/ui';
import { IUnitEntry, IUnitDetails } from '@/types/pages';
import { logger } from '@/utils/logger';

const MAX_COMPARE = 4;

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export default function ComparePage(): React.ReactElement {
  const [catalog, setCatalog] = useState<IUnitEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<IUnitDetails[]>([]);
  const [loadingUnits, setLoadingUnits] = useState<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;

    const abortCatalogFetch = () => {
      disposed = true;
      controller.abort();
    };

    window.addEventListener('beforeunload', abortCatalogFetch);
    window.addEventListener('pagehide', abortCatalogFetch);

    async function fetchCatalog() {
      try {
        const response = await fetch('/api/catalog', {
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          success: boolean;
          data?: IUnitEntry[];
        };
        if (data.success) {
          setCatalog(data.data || []);
        }
      } catch (err) {
        if (disposed || controller.signal.aborted || isAbortError(err)) return;
        logger.error('Failed to fetch catalog:', err);
      } finally {
        if (disposed || controller.signal.aborted) return;
        setCatalogLoading(false);
      }
    }
    fetchCatalog();

    return () => {
      window.removeEventListener('beforeunload', abortCatalogFetch);
      window.removeEventListener('pagehide', abortCatalogFetch);
      abortCatalogFetch();
    };
  }, []);

  const filteredCatalog = catalog
    .filter((unit) => {
      if (!searchTerm) return false;
      const search = searchTerm.toLowerCase();
      return (
        unit.name.toLowerCase().includes(search) ||
        unit.chassis.toLowerCase().includes(search)
      );
    })
    .slice(0, 10);

  const addUnit = useCallback(
    async (entry: IUnitEntry) => {
      if (selectedUnits.length >= MAX_COMPARE) return;
      if (selectedUnits.some((u) => u.id === entry.id)) return;

      setLoadingUnits((prev) => new Set(prev).add(entry.id));

      try {
        const response = await fetch(
          `/api/units?id=${encodeURIComponent(entry.id)}`,
        );
        const data = (await response.json()) as {
          success: boolean;
          data?: IUnitDetails;
        };

        if (data.success && data.data) {
          setSelectedUnits((prev) => [...prev, data.data as IUnitDetails]);
        }
      } catch (err) {
        logger.error('Failed to load unit:', err);
      } finally {
        setLoadingUnits((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }

      setSearchTerm('');
    },
    [selectedUnits],
  );

  const removeUnit = (id: string) => {
    setSelectedUnits((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <PageLayout
      title="Unit Comparison"
      subtitle={`Compare up to ${MAX_COMPARE} units side-by-side`}
    >
      <div className="relative mb-6">
        <Input
          type="text"
          placeholder="Search for a unit to add..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={selectedUnits.length >= MAX_COMPARE}
          variant="large"
          aria-label="Search units to compare"
        />

        <CompareSearchResults
          catalogLoading={catalogLoading}
          filteredCatalog={filteredCatalog}
          loadingUnits={loadingUnits}
          onAddUnit={addUnit}
          searchTerm={searchTerm}
          selectedUnits={selectedUnits}
        />
      </div>

      <ComparisonGrid selectedUnits={selectedUnits} onRemoveUnit={removeUnit} />
      <CompareSlotsHint
        maxCompare={MAX_COMPARE}
        selectedCount={selectedUnits.length}
      />
    </PageLayout>
  );
}
