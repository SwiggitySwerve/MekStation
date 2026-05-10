import React from 'react';

import { customizerStyles as cs } from '../styles';

interface VehicleSpecialFeaturesSectionProps {
  readOnly: boolean;
  hasEnvironmentalSealing: boolean;
  hasFlotationHull: boolean;
  isAmphibious: boolean;
  hasTrailerHitch: boolean;
  isTrailer: boolean;
  setEnvironmentalSealing: (enabled: boolean) => void;
  setFlotationHull: (enabled: boolean) => void;
  setAmphibious: (enabled: boolean) => void;
  setTrailerHitch: (enabled: boolean) => void;
  setIsTrailer: (enabled: boolean) => void;
}

export function VehicleSpecialFeaturesSection({
  readOnly,
  hasEnvironmentalSealing,
  hasFlotationHull,
  isAmphibious,
  hasTrailerHitch,
  isTrailer,
  setEnvironmentalSealing,
  setFlotationHull,
  setAmphibious,
  setTrailerHitch,
  setIsTrailer,
}: VehicleSpecialFeaturesSectionProps): React.ReactElement {
  return (
    <section>
      <h3 className={cs.text.sectionTitle}>Special Features</h3>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasEnvironmentalSealing}
            onChange={(e) => setEnvironmentalSealing(e.target.checked)}
            disabled={readOnly}
            className="border-border-theme bg-surface-raised rounded"
          />
          <span className={cs.text.label}>Environmental Sealing</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasFlotationHull}
            onChange={(e) => setFlotationHull(e.target.checked)}
            disabled={readOnly}
            className="border-border-theme bg-surface-raised rounded"
          />
          <span className={cs.text.label}>Flotation Hull</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isAmphibious}
            onChange={(e) => setAmphibious(e.target.checked)}
            disabled={readOnly}
            className="border-border-theme bg-surface-raised rounded"
          />
          <span className={cs.text.label}>Amphibious</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasTrailerHitch}
            onChange={(e) => setTrailerHitch(e.target.checked)}
            disabled={readOnly}
            className="border-border-theme bg-surface-raised rounded"
          />
          <span className={cs.text.label}>Trailer Hitch</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isTrailer}
            onChange={(e) => setIsTrailer(e.target.checked)}
            disabled={readOnly}
            className="border-border-theme bg-surface-raised rounded"
          />
          <span className={cs.text.label}>Is Trailer (no engine)</span>
        </label>
      </div>
    </section>
  );
}
