import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppShell } from './app/AppShell';
import { useAppStore } from './store/useAppStore';
import { fetchHealthStatus } from './services/api';

/*
 * Split from the shell: the auth screen is the one thing a returning user with
 * a live session never sees, and the shell is the one thing a first-time
 * visitor cannot reach. Neither should be in the other's bundle.
 */
const AuthScreen = lazy(() => import('./features/auth/AuthScreen').then((m) => ({ default: m.AuthScreen })));
const LandingScreen = lazy(() => import('./features/auth/LandingScreen').then((m) => ({ default: m.LandingScreen })));

/*
 * The unauthenticated pair: a hero screen that sells the product in five
 * seconds, then the form. `stage` doubles as the AuthScreen's initial mode
 * ('login' | 'signup') so the landing page's two buttons land straight on the
 * right panel instead of always opening login.
 */
const Gate = () => {
  const [stage, setStage] = useState('landing'); // 'landing' | 'login' | 'signup'

  if (stage === 'landing') {
    return <LandingScreen onEnter={setStage} />;
  }
  return <AuthScreen initialMode={stage} onBack={() => setStage('landing')} />;
};

export function App() {
  const setSystemHealth = useAppStore((state) => state.setSystemHealth);
  const user = useAppStore((state) => state.user);

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
