import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { tabsForRole } from './routes';

/**
 * Primary navigation, pinned to the bottom on phones.
 *
 * Bottom rather than top because the whole nav sits inside thumb reach on a
 * 6-inch handset held one-handed — which is how this app will actually be
 * used, often while standing in a field.
 *
 * Each tab is a 64px target carrying an icon above its label. The icon is not
 * decoration: it is the part a farmer who reads slowly will navigate by, so
 * the pairing has to be consistent everywhere the destination appears.
 */
export const BottomNav = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const activeRole = useAppStore((state) => state.activeRole);
  const { t } = useT();

  const tabs = tabsForRole(activeRole);

  return (
    <nav
      aria-label={t('roles.label')}
      className="
        sticky bottom-0 z-40 border-t-2 border-ink bg-white
        pb-[env(safe-area-inset-bottom)]
        md:hidden
      "
    >
      <ul className="mx-auto flex max-w-3xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  relative w-full min-h-[4rem] px-1 py-2
                  flex flex-col items-center justify-center gap-1
                  ${isActive ? 'bg-forest-700 text-white' : 'bg-white text-ink-soft hover:bg-forest-50'}
                `}
              >
                <Icon
                  className="h-6 w-6 shrink-0"
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span className={`text-xs leading-none text-center ${isActive ? 'font-bold' : 'font-semibold'}`}>
                  {t(tab.labelKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
