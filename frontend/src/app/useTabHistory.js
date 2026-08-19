import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ALL_TAB_IDS } from './routes';

/**
 * Makes the Android back button work, without adding a router.
 *
 * Previously every tab lived in a single zustand string with no history entry
 * behind it, so pressing back from any screen closed the app. That is a real
 * problem for the audience: back is the one navigation gesture every Android
 * user already knows, and having it eject you from the app teaches you not to
 * explore.
 *
 * This syncs `activeTab` to the URL in both directions — roughly twenty lines
 * for the behaviour a router would give us, minus the dependency and the
 * rewrite. It also gives the demo deep links (`?tab=price`).
 */
export const useTabHistory = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  // Adopt ?tab= on first load, then follow back/forward.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    if (fromUrl && ALL_TAB_IDS.includes(fromUrl)) {
      setActiveTab(fromUrl);
    }

    const onPopState = (event) => {
      const tab = event.state?.tab;
      if (tab && ALL_TAB_IDS.includes(tab)) setActiveTab(tab);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setActiveTab]);

  // Push a history entry whenever the tab changes, so back returns to the previous one.
  useEffect(() => {
    if (window.history.state?.tab === activeTab) return;

    const url = `${window.location.pathname}?tab=${activeTab}`;
    // replaceState on the very first entry, so back does not land on a blank tab.
    const method = window.history.state?.tab ? 'pushState' : 'replaceState';
    window.history[method]({ tab: activeTab }, '', url);
  }, [activeTab]);
};

export default useTabHistory;
