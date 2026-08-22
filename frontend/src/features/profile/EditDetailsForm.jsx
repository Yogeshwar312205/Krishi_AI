import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Sprout, Check, X, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { updateProfile } from '../../services/api';
import { normaliseRole, ROLES } from '../../app/routes';
import { CROP_OPTIONS } from '../../utils/constants';
import { Field } from '../../design/primitives/Field';
import { Button } from '../../design/primitives/Button';

/**
 * The account's own details, editable by the account.
 *
 * Deliberately the same fields, in the same order, with the same labels and the
 * same validation as the signup form — this is that form again, pre-filled.
 * Someone who filled in "Village" three months ago should not have to work out
 * that it is now called something else.
 *
 * Two things are NOT here:
 *
 *   Role. It decides which tabs exist and which endpoints authorise, so it is
 *   an operator change, not a self-service one. The server refuses it too.
 *
 *   The current consignment's crop. `primaryCrop` is what this farm mainly
 *   grows; `cropDetails.cropType` is the lot being sold this week, and deals
 *   are filtered by that one. Editing the account must not silently re-point a
 *   tomato deal at an onion consignment, so this form never touches it.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same rule as AuthScreen: ten digits starting 6-9, +91 and separators stripped.
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const bareDigits = (value) => value.trim().replace(/^(\+?91[\s-]?)/, '').replace(/[\s-]/g, '');

export const EditDetailsForm = ({ onSaved, onCancel }) => {
  const user = useAppStore((state) => state.user);
  const activeRole = useAppStore((state) => state.activeRole);
  const updateUser = useAppStore((state) => state.updateUser);
  const { t } = useT();

  const isFarmer = normaliseRole(activeRole) === ROLES.FARMER;

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    primaryCrop: user?.primaryCrop || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError(t('auth.required'));
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (!PHONE_PATTERN.test(bareDigits(form.phone))) {
      setError(t('auth.invalidPhone'));
      return;
    }

    setBusy(true);
    try {
      const { user: saved, offline } = await updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        ...(isFarmer ? { primaryCrop: form.primaryCrop } : {}),
      });
      // The server's answer is what the session becomes, not what was typed —
      // it lowercases the email and returns the shape every screen reads.
      updateUser(saved);
      onSaved?.(offline);
    } catch (err) {
      setError(err.message || t('common.error'));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="detail-enter space-y-4">
      {error && (
        <p className="notice notice-bad" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      <Field
        label={t('crop.profile.name')}
        icon={User}
        name="name"
        value={form.name}
        onChange={update}
        autoComplete="name"
        required
      />

      <Field
        label={t('crop.profile.email')}
        icon={Mail}
        type="email"
        name="email"
        value={form.email}
        onChange={update}
        autoComplete="email"
        inputMode="email"
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('crop.profile.phone')}
          icon={Phone}
          type="tel"
          name="phone"
          value={form.phone}
          onChange={update}
          placeholder="+91 98765 43210"
          autoComplete="tel"
          inputMode="tel"
          required
        />
        <Field
          label={t('crop.profile.village')}
          icon={MapPin}
          name="location"
          value={form.location}
          onChange={update}
          placeholder="Nashik"
          autoComplete="address-level2"
        />
      </div>

      {isFarmer && (
        <div>
          <label className="field-label" htmlFor="profile-crop">{t('crop.profile.crop')}</label>
          <div className="relative flex items-center">
            <Sprout
              className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint"
              strokeWidth={2.25}
              aria-hidden="true"
            />
            <select
              id="profile-crop"
              name="primaryCrop"
              value={form.primaryCrop}
              onChange={update}
              className="field field-icon cursor-pointer appearance-none pr-11"
            >
              {/* An account that never answered this keeps that answer available:
                  filling the blank in for them would be inventing a fact. */}
              <option value="">{t('crop.profile.notSet')}</option>
              {CROP_OPTIONS.map((crop) => (
                <option key={crop} value={crop}>{t(`crops.${crop}`)}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="submit" busy={busy} icon={busy ? Loader2 : Check}>
          {busy ? t('auth.working') : t('common.save')}
        </Button>
        <Button variant="secondary" icon={X} onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
};

export default EditDetailsForm;
