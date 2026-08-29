import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppShell } from './app/AppShell';
import { useAppStore } from './store/useAppStore';
import { fetchHealthStatus } from './services/api';
import { prefetch } from './data/marketCache';
import { BOARD_CROPS } from './utils/constants';
import { LanguagePicker } from './shared/LanguagePicker';

/*
 * Split from the shell: the auth screen is the one thing a returning user with
 * a live session never sees, and the shell is the one thing a first-time
 * visitor cannot reach. Neither should be in the other's bundle.
 */
const AuthScreen = lazy(() => import('./features/auth/AuthScreen').then((m) => ({ default: m.AuthScreen })));
const LandingScreen = lazy(() => import('./features/auth/LandingScreen').then((m) => ({ default: m.LandingScreen })));
/*
 * The dispatch-routing walk-through is reachable before sign-in — it is a
 * "here is what this app does" piece, and a visitor deciding whether to sign up
 * is exactly its audience. It renders its own chrome and a back control.
 */
const VrpSimulationScreen = lazy(() => import('./features/logistics/VrpSimulationScreen').then((m) => ({ default: m.VrpSimulationScreen })));
/*
 * The Blackout resilience drill — also reachable before sign-in. Its endpoints
 * are unauthenticated by design (a wiped user table must not lock the recovery
 * tools away), so a visitor can watch the whole detect → recover cycle.
 */
const BlackoutConsoleScreen = lazy(() => import('./features/system/BlackoutConsoleScreen').then((m) => ({ default: m.BlackoutConsoleScreen })));

/*
 * The unauthenticated pair: a hero screen that sells the product in five
 * seconds, then the form. `stage` doubles as the AuthScreen's initial mode
 * ('login' | 'signup') so the landing page's two buttons land straight on the
 * right panel instead of always opening login.
 */
const Gate = () => {
  const [stage, setStage] = useState('landing'); // 'landing' | 'login' | 'signup' | 'vrp-demo' | 'blackout'

  if (stage === 'landing') {
    // The landing screen keeps the picker in a sticky header band of its own —
    // the whole screen is one green surface, so the band is seamless.
    return <LandingScreen onEnter={setStage} />;
  }

  if (stage === 'vrp-demo') {
    return <VrpSimulationScreen onExit={() => setStage('landing')} />;
  }

  if (stage === 'blackout') {
    return <BlackoutConsoleScreen onExit={() => setStage('landing')} />;
  }

  return (
    <>
      {/*
       * The sign-up form runs several screens deep on a phone, and its own
       * header (with the picker) belongs to the short green panel above it —
       * scroll into the fields and the way to another language is gone. So on
       * mobile the picker is pinned to the viewport corner here instead: a
       * solid ruled box, no shadow, the way a stamp sits on a page. The
       * desktop auth panel carries its own where there is room.
       */}
      <div className="fixed right-2 top-2 z-50 lg:hidden">
        <LanguagePicker compact />
      </div>
      <AuthScreen initialMode={stage} onBack={() => setStage('landing')} />
    </>
  );
};

export function App() {
  const setSystemHealth = useAppStore((state) => state.setSystemHealth);
  const user = useAppStore((state) => state.user);

  const cropType = useAppStore((state) => state.cropDetails.cropType);

  useEffect(() => {
    // Guards against applying a response after unmount (React 18 StrictMode
    // double-invokes effects in development).
    let cancelled = false;

    fetchHealthStatus().then((health) => {
      if (!cancelled) setSystemHealth(health);
    });

    return () => { cancelled = true; };
  }, [setSystemHealth]);

  /*
   * Warm the mandi cache at start-up, not at first render of each screen.
   *
   * These are the crops the first two things anyone sees are built from — the
   * landing rate board and the farmer's own crop — so fetching them here means
   * moving between Today, Prices and the landing board costs no network at all
   * for the next ten minutes. See data/marketCache.js.
   */
  useEffect(() => {
    prefetch([...new Set([cropType, ...BOARD_CROPS])]);
  }, [cropType]);

  /*
   * The optimisation call that used to run here on mount was removed: it fired
   * on every page load, for every role, to warm a panel most sessions never
   * opened. The Transport screen will request a route when a farmer actually
   * asks for one — which is also the only point at which we know the crop,
   * quantity and destination they mean.
   */

  /*
   * The gate. Until this existed the app booted straight into a farmer
   * dashboard with nobody signed in — greeting an anonymous visitor by no name,
   * showing a stranger's crop, and offering a "Book a vehicle" button that had
   * no account to book against. Sign-in is not a screen the user visits; it is
   * the condition for there being an app at all.
   */
  if (!user) {
    return (
      <Suspense fallback={<div className="min-h-full bg-forest-700" />}>
        <Gate />
      </Suspense>
    );
  }

  return <AppShell />;
}

export default App;
