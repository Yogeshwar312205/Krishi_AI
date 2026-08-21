import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { LanguagePicker } from '../shared/LanguagePicker';
import { normaliseRole, ROLES, PROFILE_TAB } from './routes';

/**
 * A thin band, not a navigation bar — navigation lives in the bottom bar on
 * phones and the left rail on desktop.
 *
 * It adapts rather than duplicating: on mobile it carries the wordmark and the
 * language picker, because there is no rail to hold them. From `md` up the rail
 * owns both, so the bar drops to the identity chip and the role switch.
 *
 * The old header stacked a brand block, three selects, a "Traffic Sim" dev
 * button, a profile button and a nine-item scrolling sub-nav into 112px before
 * you reached anything you came for.
 */
const ROLE_KEYS = {
  [ROLES.FARMER]: 'roles.farmer',
  [ROLES.BUYER]: 'roles.buyer',
  [ROLES.LOGISTICS]: 'roles.logistics',
};

export const TopBar = () => {
  const activeRole = useAppStore((state) => state.activeRole);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const user = useAppStore((state) => state.user);
  const { t } = useT();

  const role = normaliseRole(activeRole);
  const onProfile = activeTab === PROFILE_TAB;

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-white/95 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">

        {/* Wordmark — mobile only; the desktop rail carries it. */}
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <span className="h-7 w-1.5 shrink-0 bg-forest-700" aria-hidden="true" />
          <span className="font-display text-xl leading-none tracking-tight text-ink">
            Krushi<span className="text-terracotta-500">Flow</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="md:hidden">
            <LanguagePicker compact />
          </div>

          {/* A role is who signed in, not a view to switch on a whim — this used
              to be a <select> that rewrote the signed-in user's role client-side
              and jumped them into another role's screens, with no permission
              check of any kind. It's a fixed label now. */}
          <span
            className="
              flex h-[2.125rem] items-center border-2 border-ink bg-white px-2.5 text-sm
              font-bold text-ink
            "
          >
            {t(ROLE_KEYS[role])}
          </span>

          {/*
            The identity chip, and the only way to the profile screen.
            The initial square carries it on a phone, where the name would eat
            the bar; from `sm` up the name comes along, because "you are signed
            in as someone" is worth stating and a lone letter does not state it.
          */}
          <button
            type="button"
            onClick={() => setActiveTab(PROFILE_TAB)}
            aria-current={onProfile ? 'page' : undefined}
            aria-label={t('crop.profile.title')}
            className={`
              flex h-[2.125rem] max-w-[10rem] items-center gap-2 border-2 border-ink pr-0
              transition-colors sm:pr-2.5
              ${onProfile ? 'bg-forest-700 text-white' : 'bg-white text-ink hover:bg-forest-50'}
            `}
          >
            <span
              className={`
                flex h-full w-[1.875rem] shrink-0 items-center justify-center
                font-display text-lg leading-none
                ${onProfile ? 'bg-forest-700 text-white' : 'bg-ink text-paper'}
              `}
              aria-hidden="true"
            >
              {(user?.name || '?').trim().charAt(0).toUpperCase()}
            </span>
            <span className="hidden truncate text-sm font-bold sm:block">
              {user?.name?.split(' ')[0] || t('crop.profile.title')}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
