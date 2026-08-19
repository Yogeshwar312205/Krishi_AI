import React from 'react';
import { DemoStamp } from './DemoStamp';
import { LiveStamp, LoadingStamp } from './LiveStamp';

/**
 * Picks the right provenance stamp for a useLiveMarket() status: still
 * fetching, confirmed live, or settled on the demo baseline. 'partial' (some
 * but not all canonical mandis matched a live record) is treated as demo,
 * since the row-level mix isn't disclosed anywhere but the raw data.
 */
export const MarketStatusStamp = ({ status, className = '' }) => {
  if (status === 'loading') return <LoadingStamp className={className} />;
  if (status === 'live') return <LiveStamp className={className} />;
  return <DemoStamp className={className} />;
};

export default MarketStatusStamp;
