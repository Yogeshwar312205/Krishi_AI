import React from 'react';
import { LogOut } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { normaliseRole, ROLES } from '../../app/routes';
import { SectionHead } from '../../design/primitives/SectionHead';
import { LedgerRow } from '../../design/primitives/LedgerRow';
import { Button } from '../../design/primitives/Button';
import { LanguagePicker } from '../../shared/LanguagePicker';

/**
 * Who is signed in, and the way out.
 *
 * One component rather than a per-role profile page: a driver and a buyer need
 * exactly the same five facts about themselves as a farmer does, and the old
 * build's answer to that was a farmer-shaped profile card that told a logged-in
 * buyer they were a "Tomato Producer" with "SMS price alerts enabled".
 *
 * Everything here is read from the session. Nothing is invented — a field the
 * account never filled in says so, rather than being filled in for it.
 */
const ROLE_KEYS = {
  [ROLES.FARMER]: 'roles.farmer',
  [ROLES.BUYER]: 'roles.buyer',
  [ROLES.LOGISTICS]: 'roles.logistics',
};

export const ProfilePanel = ({ showHead = true }) => {
  const user = useAppStore((state) => state.user);
  const activeRole = useAppStore((state) => state.activeRole);
  const logout = useAppStore((state) => state.logout);
  const { t } = useT();

  const blank = t('crop.profile.notSet');
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <section className="space-y-4">
      {showHead && <SectionHead title={t('crop.profile.title')} />}

      <div className="border-2 border-ink bg-white">
        {/* Name block: the one place an avatar earns its keep, as a square chip. */}
        <div className="flex items-center gap-3.5 border-b-2 border-ink px-4 py-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center bg-forest-700 font-display text-3xl leading-none text-white"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-3xl leading-none text-ink">
              {user?.name || blank}
            </p>
            <p className="mt-1 text-base text-ink-soft">
              {t(ROLE_KEYS[normaliseRole(activeRole)])}
            </p>
          </div>
        </div>

        <div className="px-4">
          <LedgerRow label={t('crop.profile.email')} value={<span className="font-sans text-base">{user?.email || blank}</span>} />
          <LedgerRow label={t('crop.profile.phone')} value={<span className="font-sans text-base tnum">{user?.phone || blank}</span>} />
          <LedgerRow label={t('crop.profile.village')} value={<span className="font-sans text-base">{user?.location || blank}</span>} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <span className="text-sm font-bold text-ink">{t('lang.label')}</span>
          <LanguagePicker compact />
        </div>
      </div>

      <Button variant="secondary" icon={LogOut} onClick={logout}>
        {t('crop.profile.logout')}
      </Button>
    </section>
  );
};

export default ProfilePanel;
