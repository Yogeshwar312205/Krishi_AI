import React, { useState } from 'react';
import { Lock, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { changePassword } from '../../services/api';
import { Field } from '../../design/primitives/Field';
import { Button } from '../../design/primitives/Button';

/**
 * Changing the password, which needs the current one first.
 *
 * That extra box is the whole point of the screen: a handset is lent, left on a
 * charger, or handed to a shopkeeper to type something, and without it anyone
 * holding an unlocked phone could lock the owner out of their own account.
 *
 * Unlike the rest of the app there is no offline path here — a password changed
 * only on this device is a password that will not log the account in tomorrow.
 * When the server is unreachable, the save fails and says so.
 */

// Same rule the signup form and the server both enforce.
const isStrongPassword = (value) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

export const ChangePasswordForm = ({ onSaved, onCancel }) => {
  const { t } = useT();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.currentPassword || !form.newPassword) {
      setError(t('auth.required'));
      return;
    }
    if (!isStrongPassword(form.newPassword)) {
      setError(t('auth.shortPassword'));
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError(t('auth.mismatch'));
      return;
    }

    setBusy(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      onSaved?.();
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
        label={t('crop.profile.currentPassword')}
        icon={Lock}
        type="password"
        name="currentPassword"
        value={form.currentPassword}
        onChange={update}
        placeholder="••••••"
        autoComplete="current-password"
        required
      />

      <Field
        label={t('crop.profile.newPassword')}
        icon={Lock}
        type="password"
        name="newPassword"
        value={form.newPassword}
        onChange={update}
        placeholder="••••••"
        autoComplete="new-password"
        hint={t('auth.passwordHint')}
        required
      />

      <Field
        label={t('crop.profile.confirmNewPassword')}
        icon={Lock}
        type="password"
        name="confirmPassword"
        value={form.confirmPassword}
        onChange={update}
        placeholder="••••••"
        autoComplete="new-password"
        required
      />

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

export default ChangePasswordForm;
