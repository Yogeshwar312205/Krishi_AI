import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wheat, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { CROP_OPTIONS } from '../../utils/constants';
import { MAHARASHTRA_MANDIS } from '../../data/mandiList';
import { SectionHead } from '../../design/primitives/SectionHead';
import { Field } from '../../design/primitives/Field';
import { Button } from '../../design/primitives/Button';
import { LedgerRow } from '../../design/primitives/LedgerRow';
import { SearchableSelect } from '../../design/primitives/SearchableSelect';
import { createBuyerPosting, fetchMyBuyerPostings, deleteBuyerPosting } from '../../services/api';

const EMPTY_FORM = {
  cropType: CROP_OPTIONS[0],
  grade: '',
  offeredPricePerKg: '',
  requiredQuantityKg: '',
  mandiName: MAHARASHTRA_MANDIS[0]?.value || '',
};

/**
 * The buyer's own buying rates: what they're offering, per crop, and to whom
 * farmers are sending produce because of it. Replaces BuyerDashboard.jsx's
 * postings table, which mixed this with the header telemetry and the inbound
 * shipment feed on one screen regardless of which nav tab was tapped.
 */
export const BuyerRatesScreen = () => {
  const user = useAppStore((state) => state.user);
  const { t, rate, number } = useT();

  const [buyerPostings, setBuyerPostings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  // Fetch buyer's postings on mount
  useEffect(() => {
    loadPostings();
  }, []);

  const loadPostings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const postings = await fetchMyBuyerPostings();
      setBuyerPostings(postings);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const newPosting = await createBuyerPosting({
        cropType: form.cropType,
        grade: form.grade,
        offeredPricePerKg: Number(form.offeredPricePerKg),
        requiredQuantityKg: Number(form.requiredQuantityKg),
        mandiName: form.mandiName,
        expiresInDays: 7,
      });
      
      // Add to local state
      setBuyerPostings((prev) => [newPosting, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBuyerPosting(id);
      setBuyerPostings((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Calculate expiry display
  const getExpiryDisplay = (expiresAt) => {
    if (!expiresAt) return '—';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return t('buyer.rates.expired');
    if (diffDays === 0) return t('common.today');
    if (diffDays === 1) return '1 Day';
    return `${diffDays} Days`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pt-4 pb-4">
        <SectionHead level="screen" title={t('buyer.rates.title')} />
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-2xl text-ink-faint">{t('common.loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead
        level="screen"
        title={t('buyer.rates.title')}
        action={
          <Button variant="accent" icon={Plus} full={false} onClick={() => setShowForm((v) => !v)} disabled={isSubmitting}>
            {t('buyer.rates.post')}
          </Button>
        }
      />

      {error && (
        <div className="border-2 border-terracotta-700 bg-terracotta-50 px-4 py-3 text-sm text-terracotta-900">
          <strong>Error:</strong> {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="detail-enter space-y-4 border-2 border-ink bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="rate-crop">{t('buyer.rates.crop')}</label>
              <div className="relative flex items-center">
                <Wheat className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
                <select
                  id="rate-crop"
                  name="cropType"
                  value={form.cropType}
                  onChange={update}
                  className="field field-icon cursor-pointer appearance-none pr-11"
                >
                  {CROP_OPTIONS.map((crop) => (
                    <option key={crop} value={crop}>{t(`crops.${crop}`)}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
              </div>
            </div>

            <Field
              label={t('buyer.rates.grade')}
              name="grade"
              value={form.grade}
              onChange={update}
              placeholder="Grade-A Premium Red"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('buyer.rates.price')}
              type="number"
              name="offeredPricePerKg"
              value={form.offeredPricePerKg}
              onChange={update}
              min="0"
              step="0.5"
              required
            />
            <Field
              label={t('buyer.rates.quantity')}
              type="number"
              name="requiredQuantityKg"
              value={form.requiredQuantityKg}
              onChange={update}
              min="0"
              required
            />
          </div>

          <div>
            <SearchableSelect
              label={t('buyer.rates.mandi')}
              id="rate-mandi"
              value={form.mandiName}
              onChange={(value) => setForm((current) => ({ ...current, mandiName: value }))}
              options={MAHARASHTRA_MANDIS}
              placeholder="Select APMC Mandi"
              searchPlaceholder="Search mandis by name or district..."
            />
          </div>

          <Button type="submit" icon={Plus} disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') + '...' : t('buyer.rates.post')}
          </Button>
        </form>
      )}

      {buyerPostings.length === 0 ? (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('buyer.rates.empty')}</p>
        </div>
      ) : (
        <div className="stagger space-y-3">
          {buyerPostings.map((posting) => (
            <article key={posting.id} className="border-2 border-ink bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
                <div className="min-w-0">
                  <p className="font-display text-2xl leading-none text-ink">
                    {t(`crops.${posting.cropType}`)}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{posting.grade}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(posting.id)}
                  className="lift shrink-0 border-2 border-ink p-2 text-ink hover:bg-terracotta-50 hover:text-terracotta-700"
                  aria-label={t('buyer.rates.remove')}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                </button>
              </div>

              <div className="px-4">
                <LedgerRow label={t('buyer.rates.mandi')} value={<span className="font-sans text-base">{posting.mandiName}</span>} />
                <LedgerRow
                  label={t('buyer.rates.price')}
                  value={`${rate(posting.offeredPricePerKg)} / ${t('common.kg')}`}
                  emphasis
                />
                <LedgerRow label={t('buyer.rates.quantity')} value={<span className="font-sans text-base tnum">{number(posting.requiredQuantityKg)} {t('common.kg')}</span>} />
                <LedgerRow label={t('buyer.rates.received')} value={<span className="font-sans text-base tnum">{number(posting.receivedQuantityKg)} {t('common.kg')}</span>} />
                <LedgerRow label={t('buyer.rates.expires')} value={<span className="font-sans text-base">{getExpiryDisplay(posting.expiresAt)}</span>} />
              </div>
            </article>
          ))}
        </div>
      )}


    </div>
  );
};

export default BuyerRatesScreen;
