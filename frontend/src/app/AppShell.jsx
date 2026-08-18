import React, { Suspense, lazy, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { useTabHistory } from './useTabHistory';
import { normaliseRole, defaultTabForRole, isTabValidForRole, PROFILE_TAB } from './routes';

import { TodayScreen } from '../features/farmer/today/TodayScreen';
import { PriceScreen } from '../features/farmer/price/PriceScreen';

/*
 * The farmer's other two screens are lazy — they are a tap away, not on the
 * critical path to the verdict, and Today is what has to paint fast on a
 * 3G handset standing in a field.
 */
const TransportScreen = lazy(() => import('../features/farmer/transport/TransportScreen').then((m) => ({ default: m.TransportScreen })));
const CropScreen = lazy(() => import('../features/farmer/crop/CropScreen').then((m) => ({ default: m.CropScreen })));

/*
 * Driver and buyer screens are lazy-loaded, so a farmer who never opens those
 * views never downloads them.
 */
const DriverJobsScreen = lazy(() => import('../features/driver/DriverJobsScreen').then((m) => ({ default: m.DriverJobsScreen })));
const DriverVehiclesScreen = lazy(() => import('../features/driver/DriverVehiclesScreen').then((m) => ({ default: m.DriverVehiclesScreen })));
const DriverRouteScreen = lazy(() => import('../features/driver/DriverRouteScreen').then((m) => ({ default: m.DriverRouteScreen })));
const BuyerRatesScreen = lazy(() => import('../features/buyer/BuyerRatesScreen').then((m) => ({ default: m.BuyerRatesScreen })));
const BuyerInboundScreen = lazy(() => import('../features/buyer/BuyerInboundScreen').then((m) => ({ default: m.BuyerInboundScreen })));
const ProfilePanel = lazy(() => import('../features/profile/ProfilePanel').then((m) => ({ default: m.ProfilePanel })));

/* The assistant is deferred but always mounted — see VoiceAssistant for why. */
const VoiceAssistant = lazy(() => import('../shared/voice/VoiceAssistant').then((m) => ({ default: m.VoiceAssistant })));

const Loading = () => {
  const { t } = useT();
  return <div className="py-16 text-center text-ink-faint">{t('common.loading')}</div>;
};

const screenFor = (tabId) => {
  switch (tabId) {
    case 'today':
      return <TodayScreen />;
    case 'price':
      return <PriceScreen />;
    case 'transport':
      return <TransportScreen />;
    case 'crop':
      return <CropScreen />;

    /* Every role reaches this from the top bar's identity chip. */
    case PROFILE_TAB:
      return <div className="pt-4"><ProfilePanel /></div>;

    case 'driver-jobs':
      return <DriverJobsScreen />;
    case 'driver-vehicles':
      return <DriverVehiclesScreen />;
    case 'driver-route':
      return <DriverRouteScreen />;

    case 'buyer-rates':
      return <BuyerRatesScreen />;
    case 'buyer-inbound':
      return <BuyerInboundScreen />;
    case 'buyer-profile':
      return <div className="pt-4"><ProfilePanel /></div>;

    /*
     * Unreachable: routes.js is the only source of tab ids and every one of
     * them is handled above. Falling back to the role's home beats rendering
     * a dead screen if that ever stops being true.
     */
    default:
      return <TodayScreen />;
  }
};

export const AppShell = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const activeRole = useAppStore((state) => state.activeRole);

  useTabHistory();

  /*
   * A stored tab can belong to a role the user is no longer in — after a role
   * switch, or after this rebuild renamed the tabs under an existing
   * localStorage session. Recover to the role's first tab rather than showing
   * a blank screen.
   */
  const role = normaliseRole(activeRole);
  useEffect(() => {
    if (!isTabValidForRole(activeTab, role)) {
      setActiveTab(defaultTabForRole(role));
    }
  }, [activeTab, role, setActiveTab]);

  return (
    /*
     * Two layouts from one tree.
     *
     * Phone: a single column with the bar top and nav bottom, both inside
     * thumb reach.
     * Desktop (md+): a fixed left rail beside a scrolling content column. The
     * content is capped at 72rem rather than filling a 1440px window — past
     * that, a ledger row's label and value drift so far apart that the eye
     * loses the line, which is the specific thing ruled rows exist to prevent.
     */
    <div className="flex min-h-full bg-paper">
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8 sm:px-6 lg:max-w-6xl lg:px-10">
          <Suspense fallback={<Loading />}>
            {/* Keyed so each screen replays its entrance rather than cross-fading. */}
            <div key={activeTab}>{screenFor(activeTab)}</div>
          </Suspense>
        </main>

        <BottomNav />
      </div>

      <Suspense fallback={null}>
        <VoiceAssistant />
      </Suspense>
    </div>
  );
};

export default AppShell;
