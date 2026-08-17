import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { tabsForRole } from './routes';
import { LanguagePicker } from '../shared/LanguagePicker';

/**
 * Desktop navigation. Replaces the bottom bar from `md` up.
 *
 * The mobile build earns its bottom bar by thumb reach; on a laptop that
 * reasoning inverts — a horizontal strip at the bottom of a 1440px window is
 * both far from the cursor and visually adrift. A left rail puts navigation
 * where a desktop user's eye already starts, and buys back the vertical space
 * the bottom bar was taking from the content.
 *
 * Same route table, same icons, same labels as BottomNav — only the axis
 * changes, so the two never drift apart.
 */
export const SideNav = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const activeRole = useAppStore((state) => state.activeRole);
  const { t } = useT();

  const tabs = tabsForRole(activeRole);

  return (
    <aside className="hidden md:flex md:w-56 lg:w-64 shrink-0 flex-col border-r-2 border-ink bg-white">

      {/* Wordmark */}
      <div className="flex items-center gap-2.5 border-b-2 border-ink px-5 py-4">
        <span className="h-8 w-1.5 shrink-0 bg-forest-700" aria-hidden="true" />
        <span className="font-display text-2xl leading-none tracking-tight text-ink">
          Krushi<span className="text-terracotta-500">Flow</span>
        </span>
      </div>

      <nav aria-label={t('roles.label')} className="flex-1 p-3">
        <ul className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    group relative flex w-full items-center gap-3 px-3 py-3 text-left
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-forest-700 text-white'
                      : 'text-ink-soft hover:bg-forest-50 hover:text-ink'}
                  `}
                >
                  {/* Active marker: a furrow-green bar, matching the wordmark rule. */}
                  <span
                    className={`
                      absolute left-0 top-0 h-full w-1 bg-terracotta-500
                      origin-top transition-transform duration-200
                      ${isActive ? 'scale-y-100' : 'scale-y-0'}
                    `}
                    aria-hidden="true"
                  />
                  <Icon
                    className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-110"
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  <span className={`text-base leading-none ${isActive ? 'font-bold' : 'font-semibold'}`}>
                    {t(tab.labelKey)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t-2 border-ink p-3">
        <LanguagePicker />
      </div>
    </aside>
  );
};

export default SideNav;
