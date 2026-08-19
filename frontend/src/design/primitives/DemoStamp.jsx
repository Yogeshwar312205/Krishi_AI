import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useT } from '../../i18n/useT';

/**
 * Marks a figure that is invented for the demo.
 *
 * Every fabricated number in this app carries one. The stamp is plain and a
 * little ugly on purpose — it should read as an overprint on a document, never
 * as a design flourish, and it must be impossible to mistake the figure beside
 * it for a real Agmarknet rate.
 *
 * TODO(data): remove each stamp as its figure gets wired to a real source —
 *   mandi rates  -> data.gov.in Agmarknet resource (Directorate of Marketing
 *                   & Inspection daily price feed), via backend
 *                   src/services/agmarknetService.js
 *   arrivals     -> e-NAM (enam.gov.in) trade data
 * Do not hand-write replacement numbers.
 */
export const DemoStamp = ({ className = '' }) => {
  const { t } = useT();

  return (
    <span className={`stamp-demo ${className}`} title={t('common.demoTip')}>
      <FlaskConical className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {t('common.demoBadge')}
    </span>
  );
};

export default DemoStamp;
