import React, { useMemo, useState } from 'react';
import {
  Handshake, Phone, Send, Store, UserRound, HelpCircle, Check, ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useT } from '../../../i18n/useT';
import { mandiLabel } from '../../../data/useLiveMarket';
import { findTraderForMandi, KISAN_CALL_CENTRE } from '../../../data/traders';
import { SectionHead } from '../../../design/primitives/SectionHead';
import { LedgerRow } from '../../../design/primitives/LedgerRow';
import { Button } from '../../../design/primitives/Button';
import { Field } from '../../../design/primitives/Field';

/**
 * Agreeing a price with the mandi — the step that has to happen before a truck
 * is worth hiring.
 *
 * The Agmarknet modal price is the market's midpoint for yesterday's arrivals.
 * It is a good reason to pick one mandi over another, and it is not a quote
 * made to this farmer for this lot. Somebody at the destination has to say
 * "send it, at this rate" — and until they have, a booking is a truck driving
 * to a stranger.
 *
 * Two paths out, and which one you get depends on a fact we actually know:
 * whether a trader at that mandi has a live posting on KrushiFlow. If they do,
 * the farmer can message them here and their posted rate opens the
 * conversation. If they don't, we say so plainly and hand over the government
 * helpline — we do not hold phone numbers for ~290 APMC yards and inventing
 * one for a screen a farmer is about to act on would be worse than nothing.
 */

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const DealPanel = ({ comparison, onDealAgreed }) => {
  const cropDetails = useAppStore((state) => state.cropDetails);
  const buyerPostings = useAppStore((state) => state.buyerPostings);
  const deals = useAppStore((state) => state.deals);
  const pendingMandi = useAppStore((state) => state.pendingMandi);
  const createDeal = useAppStore((state) => state.createDeal);
  const sendDealMessage = useAppStore((state) => state.sendDealMessage);
  const agreeDeal = useAppStore((state) => state.agreeDeal);
  const user = useAppStore((state) => state.user);
  const { t, money, rate, number } = useT();

  // Opens on whatever the Prices screen handed over, then on the best-paying
  // mandi. Never on an empty dropdown — that question was already answered.
  const [mandiId, setMandiId] = useState(
    () => pendingMandi?.id || comparison[0]?.id || ''
  );
  const mandi = comparison.find((m) => m.id === mandiId) || pendingMandi || comparison[0];

  const [draft, setDraft] = useState('');
  const [agreedRate, setAgreedRate] = useState('');
  const [showAgree, setShowAgree] = useState(false);

  const trader = useMemo(
    () => (mandi ? findTraderForMandi(buyerPostings, mandi.name, cropDetails.cropType) : null),
    [buyerPostings, mandi, cropDetails.cropType]
  );

  const cropName = t(`crops.${cropDetails.cropType}`);

  /** The open conversation with this mandi for this crop, if one exists. */
  const deal = deals.find(
    (d) => d.mandiName === mandi?.name && d.cropType === cropDetails.cropType && d.status !== 'Closed'
  );

  if (!mandi) return null;

  const startOrSend = () => {
    const text = draft.trim();
    if (!text) return;

    if (deal) {
      sendDealMessage(deal.id, { from: 'farmer', text, at: t('common.today') + ', ' + now() });
    } else {
      createDeal({
        id: `DEAL-${Math.floor(1000 + Math.random() * 9000)}`,
        mandiName: mandi.name,
        mandiNameKey: mandi.nameKey || null,
        district: mandi.district || null,
        // The mandi's real position, so the truck the dispatcher assigns is
        // routed to where the lot was actually sold.
        mandiCoords: mandi.coordinates || null,
        distanceKm: mandi.distanceKm,
        cropType: cropDetails.cropType,
        quantityKg: cropDetails.quantityKg,
        boardRatePerKg: mandi.ratePerKg,
        agreedRatePerKg: null,
        farmerName: user?.name || '',
        farmerPhone: user?.phone || '',
        trader: trader || null,
        status: 'Enquiry Sent',
        messages: [{ from: 'farmer', text, at: t('common.today') + ', ' + now() }],
        bookingId: null,
        createdAt: t('common.today') + ', ' + now(),
      });
    }
    setDraft('');
  };

  const confirmDeal = (event) => {
    event.preventDefault();
    const value = Number(agreedRate);
    if (!Number.isFinite(value) || value <= 0) return;

    let id = deal?.id;
    if (!id) {
      // A farmer who settled the price on their own phone still needs the deal
      // on record — that is what the truck, the waybill and the buyer read.
      id = `DEAL-${Math.floor(1000 + Math.random() * 9000)}`;
      createDeal({
        id,
        mandiName: mandi.name,
        mandiNameKey: mandi.nameKey || null,
        district: mandi.district || null,
        // The mandi's real position, so the truck the dispatcher assigns is
        // routed to where the lot was actually sold.
        mandiCoords: mandi.coordinates || null,
        distanceKm: mandi.distanceKm,
        cropType: cropDetails.cropType,
        quantityKg: cropDetails.quantityKg,
        boardRatePerKg: mandi.ratePerKg,
        agreedRatePerKg: value,
        farmerName: user?.name || '',
        farmerPhone: user?.phone || '',
        trader: trader || null,
        status: 'Agreed',
        messages: [],
        bookingId: null,
        createdAt: t('common.today') + ', ' + now(),
      });
    } else {
      agreeDeal(id, { agreedRatePerKg: value, quantityKg: cropDetails.quantityKg });
    }

    setShowAgree(false);
    setAgreedRate('');
    onDealAgreed?.(id);
  };

  const suggestedRate = trader?.postedRatePerKg || mandi.ratePerKg;
  const agreedValue = deal?.agreedRatePerKg
    ? deal.agreedRatePerKg * cropDetails.quantityKg
    : null;

  return (
    <div className="space-y-5">

      {/* ---- Which mandi. Every reporting mandi, not a shortlist. ---- */}
      <div>
        <label className="field-label" htmlFor="deal-mandi">{t('deal.whichMandi')}</label>
        <select
          id="deal-mandi"
          className="field"
          value={mandiId}
          onChange={(event) => { setMandiId(event.target.value); setShowAgree(false); }}
        >
          {comparison.map((option) => (
            <option key={option.id} value={option.id}>
              {mandiLabel(t, option)} · {rate(option.ratePerKg)}/{t('common.kg')} · {number(option.distanceKm)} {t('common.km')}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-ink-faint">
          {t('deal.mandiCount', { count: comparison.length })}
        </p>
      </div>

      {/* ---- What is on the table ---- */}
      <div className="border-2 border-ink bg-white px-4">
        <LedgerRow
          label={t('deal.boardRate')}
          sub={t('deal.boardRateWhy')}
          value={`${rate(mandi.ratePerKg)}/${t('common.kg')}`}
        />
        <LedgerRow
          label={t('deal.lot')}
          value={<span className="font-sans text-base">{cropName} · {number(cropDetails.quantityKg)} {t('common.kg')}</span>}
        />
        <LedgerRow
          label={t('price.mandis.net')}
          sub={`${mandi.distanceApprox ? '~' : ''}${number(mandi.distanceKm)} ${t('common.km')}`}
          value={money(mandi.net)}
        />
      </div>

      {/* ---- Who to talk to ---- */}
      {trader ? (
        <section className="border-2 border-forest-700 bg-forest-50">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-forest-700 px-4 py-3.5">
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                {t('deal.traderOnPlatform')}
              </p>
              <p className="mt-1.5 font-display text-2xl leading-none text-ink">{trader.name}</p>
              {trader.company && <p className="mt-1 text-sm text-ink-soft">{trader.company}</p>}
            </div>
            {trader.postedRatePerKg && (
              <div className="shrink-0 text-right">
                <p className="eyebrow">{t('deal.postedRate')}</p>
                <p className="font-display text-3xl leading-none tnum text-forest-700">
                  {rate(trader.postedRatePerKg)}
                </p>
              </div>
            )}
          </div>

          {/* The conversation. Short, and about one thing. */}
          {deal?.messages?.length > 0 && (
            <div className="space-y-2.5 border-b-2 border-forest-700 px-4 py-3.5">
              {deal.messages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] border-2 px-3 py-2 ${
                    message.from === 'farmer'
                      ? 'ml-auto border-forest-700 bg-white'
                      : 'border-ink bg-turmeric-300'
                  }`}
                >
                  <p className="text-sm leading-snug text-ink">{message.text}</p>
                  <p className="mt-1 text-xs text-ink-faint tnum">{message.at}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 px-4 py-3.5">
            <Field
              label={t('deal.message')}
              icon={Send}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('deal.messagePlaceholder', {
                qty: number(cropDetails.quantityKg),
                crop: cropName,
              })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button icon={Send} onClick={startOrSend} disabled={!draft.trim()}>
                {deal ? t('deal.send') : t('deal.sendEnquiry')}
              </Button>
              <Button
                variant="secondary"
                icon={Phone}
                onClick={() => { window.location.href = `tel:${trader.phone}`; }}
              >
                {t('deal.callTrader')}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-2 border-ink bg-white">
          <div className="border-b-2 border-ink px-4 py-3.5">
            <p className="eyebrow flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {t('deal.noTraderYet')}
            </p>
            <p className="mt-1.5 leading-snug text-ink">
              {t('deal.noTraderWhy', { mandi: mandiLabel(t, mandi) })}
            </p>
          </div>
          <div className="px-4 py-3.5">
            <p className="mb-3 flex items-start gap-2 text-sm leading-snug text-ink-soft">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" strokeWidth={2.25} aria-hidden="true" />
              {t('deal.helplineWhy')}
            </p>
            <Button
              variant="secondary"
              icon={Phone}
              onClick={() => { window.location.href = `tel:${KISAN_CALL_CENTRE.replace(/-/g, '')}`; }}
            >
              {t('deal.callHelpline', { number: KISAN_CALL_CENTRE })}
            </Button>
          </div>
        </section>
      )}

      {/* ---- Record the settled price ---- */}
      {deal?.status === 'Agreed' ? (
        <div className="border-2 border-forest-700 bg-forest-50 px-4 py-4">
          <p className="eyebrow flex items-center gap-1.5">
            <Handshake className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            {t('deal.agreedTitle')}
          </p>
          <p className="mt-2 font-display text-4xl leading-none tnum text-forest-700">
            {rate(deal.agreedRatePerKg)}
            <span className="ml-1.5 font-sans text-sm font-semibold text-ink-soft">{t('common.perKg')}</span>
          </p>
          <p className="mt-2 text-base text-ink-soft tnum">
            {t('deal.agreedValue', { value: money(agreedValue) })}
          </p>
          <div className="mt-4">
            <Button icon={ChevronRight} onClick={() => onDealAgreed?.(deal.id)}>
              {t('deal.nowBook')}
            </Button>
          </div>
        </div>
      ) : showAgree ? (
        <form onSubmit={confirmDeal} className="detail-enter space-y-3 border-2 border-ink bg-white px-4 py-4">
          <p className="eyebrow">{t('deal.recordTitle')}</p>
          <Field
            label={t('deal.agreedRate')}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={agreedRate}
            onChange={(event) => setAgreedRate(event.target.value)}
            placeholder={String(suggestedRate)}
            hint={t('deal.agreedRateHint', { rate: rate(suggestedRate) })}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" icon={Check}>{t('deal.confirm')}</Button>
            <Button type="button" variant="secondary" onClick={() => setShowAgree(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" icon={Handshake} onClick={() => { setShowAgree(true); setAgreedRate(String(suggestedRate)); }}>
          {t('deal.recordCta')}
        </Button>
      )}

      {/* ---- Other conversations in progress ---- */}
      {deals.filter((d) => d.id !== deal?.id && d.status !== 'Closed').length > 0 && (
        <section className="space-y-3">
          <SectionHead level="group" title={t('deal.otherDeals')} />
          <div className="border-2 border-ink bg-white px-4">
            {deals
              .filter((d) => d.id !== deal?.id && d.status !== 'Closed')
              .map((other) => (
                <LedgerRow
                  key={other.id}
                  label={other.mandiName}
                  sub={`${t(`crops.${other.cropType}`)} · ${number(other.quantityKg)} ${t('common.kg')} · ${
                    other.status === 'Agreed' ? t('deal.status.agreed') : t('deal.status.waiting')
                  }`}
                  value={other.agreedRatePerKg ? rate(other.agreedRatePerKg) : '—'}
                  onClick={() => {
                    const match = comparison.find((m) => m.name === other.mandiName);
                    if (match) setMandiId(match.id);
                  }}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DealPanel;
