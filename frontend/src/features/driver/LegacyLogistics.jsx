import React, { Suspense, lazy } from 'react';
import { CropWizard } from '../../components/CropWizard';
import { RecommendationCards } from '../../components/RecommendationCards';
import { SectionHead } from '../../design/primitives/SectionHead';
import { useT } from '../../i18n/useT';

const MapView = lazy(() => import('../../components/MapView').then((m) => ({ default: m.MapView })));

/**
 * The VRP route view, lifted out of App.jsx unchanged apart from its heading.
 *
 * This is the driver's navigation screen for now. The farmer-facing version —
 * simple by default, with the route map behind a "show on map" disclosure —
 * lands with the Transport screen; this keeps the existing behaviour reachable
 * until then rather than leaving a dead tab.
 *
 * The heading no longer says "Live VRP Logistics & Vehicle Rerouting": VRP is a
 * solver name, not a destination. See src/i18n/GLOSSARY.md.
 */
export const LegacyLogistics = () => {
  const { t } = useT();

  return (
    <div className="space-y-6 py-4">
      <SectionHead title={t('driver.route.title')} note={t('transport.route.whyExplain')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CropWizard />
        </div>
        <div className="lg:col-span-7">
          <Suspense fallback={<div className="docket min-h-[320px] animate-pulse" />}>
            <MapView />
          </Suspense>
        </div>
      </div>

      <RecommendationCards />
    </div>
  );
};

export default LegacyLogistics;
