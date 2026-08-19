import React, { useState } from 'react';
import { Plus, Trash2, Wheat, Store, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { CROP_OPTIONS } from '../../utils/constants';
import { SectionHead } from '../../design/primitives/SectionHead';
import { Field } from '../../design/primitives/Field';
import { Button } from '../../design/primitives/Button';
import { LedgerRow } from '../../design/primitives/LedgerRow';
import { DemoStamp } from '../../design/primitives/DemoStamp';

const MANDI_OPTIONS = ['Vashi Wholesale APMC', 'Nashik Main APMC', 'Gultekdi APMC (Pune)', 'Nagpur APMC'];

const EMPTY_FORM = {
  cropType: CROP_OPTIONS[0],
  grade: '',
  offeredPricePerKg: '',
  requiredQuantityKg: '',
  mandiName: MANDI_OPTIONS[0],
};

/**
 * The buyer's own buying rates: what they're offering, per crop, and to whom
 * farmers are sending produce because of it. Replaces BuyerDashboard.jsx's
 * postings table, which mixed this with the header telemetry and the inbound
 * shipment feed on one screen regardless of which nav tab was tapped.
 */
export const BuyerRatesScreen = () => {
  const buyerPostings = useAppStore((state) => state.buyerPostings);
  const addBuyerPosting = useAppStore((state) => state.addBuyerPosting);
  const deleteBuyerPosting = useAppStore((state) => state.deleteBuyerPosting);
  const user = useAppStore((state) => state.user);
  const { t, rate, number } = useT();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    addBuyerPosting({
      id: 'BID-' + Math.floor(100 + Math.random() * 900),
      cropType: form.cropType,
      grade: form.grade,
      offeredPricePerKg: Number(form.offeredPricePerKg) || 0,
      requiredQuantityKg: Number(form.requiredQuantityKg) || 0,
      receivedQuantityKg: 0,
      mandiName: form.mandiName,
      traderName: `${user?.name || 'APMC Buyer'} (${user?.company || 'Independent Commission Agent'})`,
      traderPhone: user?.phone || '',
      status: 'Active Procurement',
      expiresIn: '7 Days',
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead
        level="screen"
        title={t('buyer.rates.title')}
        action={
          <Button variant="accent" icon={Plus} full={false} onClick={() => setShowForm((v) => !v)}>
            {t('buyer.rates.post')}
          </Button>
        }
      />

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
            <label className="field-label" htmlFor="rate-mandi">{t('buyer.rates.mandi')}</label>
            <div className="relative flex items-center">
              <Store className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
              <select
                id="rate-mandi"
                name="mandiName"
                value={form.mandiName}
                onChange={update}
                className="field field-icon cursor-pointer appearance-none pr-11"
              >
                {MANDI_OPTIONS.map((mandi) => (
                  <option key={mandi} value={mandi}>{mandi}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
            </div>
          </div>

          <Button type="submit" icon={Plus}>{t('buyer.rates.post')}</Button>
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
                  onClick={() => deleteBuyerPosting(posting.id)}
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
                <LedgerRow label={t('buyer.rates.expires')} value={<span className="font-sans text-base">{posting.expiresIn}</span>} />
              </div>
            </article>
          ))}
        </div>
      )}

      {buyerPostings.length > 0 && <DemoStamp />}
    </div>
  );
};

export default BuyerRatesScreen;
