import React from 'react';
import { Satellite, Loader2 } from 'lucide-react';
import { useT } from '../../i18n/useT';

/**
 * The honest counterpart to <DemoStamp />: marks a figure that came from the
 * government Agmarknet feed rather than demoMarket.js. Same overprint shape
 * and weight as the demo stamp so neither reads as more or less official than
 * it is — only the color and the source named in the tooltip differ.
 */
export const LiveStamp = ({ className = '' }) => {
  const { t } = useT();

  return (
    <span className={`stamp-live ${className}`} title={t('common.liveTip')}>
      <Satellite className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {t('common.liveBadge')}
    </span>
  );
};

/**
 * Shown while the live fetch is still in flight, over the demo baseline
 * already on screen — so the switch to real numbers reads as an update
 * rather than an unexplained jump.
 */
export const LoadingStamp = ({ className = '' }) => {
  const { t } = useT();

  return (
    <span className={`stamp-loading ${className}`} title={t('common.loadingTip')}>
      <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} aria-hidden="true" />
      {t('common.loadingBadge')}
    </span>
  );
};

export default LiveStamp;
