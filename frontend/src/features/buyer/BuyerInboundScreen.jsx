import React, { useState, useEffect } from 'react';
import { Truck, MessageSquare, Send, Handshake, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { fetchBuyerInbound } from '../../services/api';
import { SectionHead } from '../../design/primitives/SectionHead';
import { LedgerRow } from '../../design/primitives/LedgerRow';
import { Button } from '../../design/primitives/Button';
import { Field } from '../../design/primitives/Field';

/**
 * The buyer's inbox: farmers asking about a price, then the produce that asking
 * turned into.
 *
 * Enquiries sit above shipments because they are the half that needs an answer.
 * A farmer who has messaged this trader is holding a harvest and waiting for a
 * number before they will hire a truck — leaving that unanswered is the one
 * thing on this screen that costs somebody money.
 */
export const BuyerInboundScreen = () => {
  const deals = useAppStore((state) => state.deals);
  const sendDealMessage = useAppStore((state) => state.sendDealMessage);
  const agreeDeal = useAppStore((state) => state.agreeDeal);
  const { t, number, rate, money } = useT();

  const [replies, setReplies] = useState({});
  const [quotes, setQuotes] = useState({});
  const [inboundShipments, setInboundShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInbound = async () => {
    setLoading(true);
    try {
      const shipments = await fetchBuyerInbound();
      console.log('Loaded inbound shipments:', shipments);
      setInboundShipments(shipments || []);
    } catch (err) {
      console.error('Failed to load inbound shipments:', err);
      setInboundShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbound();
  }, []);

  const open = deals.filter((deal) => deal.status !== 'Closed');

  const reply = (deal) => {
    const text = (replies[deal.id] || '').trim();
    if (!text) return;
    sendDealMessage(deal.id, {
      from: 'trader',
      text,
      at: t('common.today') + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setReplies((current) => ({ ...current, [deal.id]: '' }));
  };

  const quote = (deal) => {
    const value = Number(quotes[deal.id]);
    if (!Number.isFinite(value) || value <= 0) return;
    agreeDeal(deal.id, { agreedRatePerKg: value });
    sendDealMessage(deal.id, {
      from: 'trader',
      text: t('buyer.deals.quotedMessage', { rate: rate(value) }),
      at: t('common.today') + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setQuotes((current) => ({ ...current, [deal.id]: '' }));
  };

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead level="screen" title={t('buyer.inbound.title')} />

      {/* ---- Farmers waiting on a price ---- */}
      {open.length > 0 && (
        <section className="space-y-3">
          <SectionHead level="group" title={t('buyer.deals.title')} />
          {open.map((deal) => (
            <article key={deal.id} className="border-2 border-ink bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <MessageSquare className="h-5 w-5 shrink-0 text-forest-700" strokeWidth={2.25} aria-hidden="true" />
                  <p className="font-display text-2xl leading-none text-ink">
                    {t(`crops.${deal.cropType}`)} · <span className="tnum">{number(deal.quantityKg)} {t('common.kg')}</span>
                  </p>
                </div>
                <span className={`border-2 border-ink px-2 py-1 text-sm font-bold leading-none text-ink ${
                  deal.status === 'Agreed' ? 'bg-forest-200' : 'bg-turmeric-300'
                }`}>
                  {deal.status === 'Agreed' ? t('deal.status.agreed') : t('deal.status.waiting')}
                </span>
              </div>

              <div className="px-4">
                <LedgerRow
                  label={t('buyer.deals.from')}
                  sub={deal.mandiName}
                  value={<span className="font-sans text-base">{deal.farmerName || '—'}</span>}
                />
                <LedgerRow
                  label={t('deal.boardRate')}
                  value={<span className="font-sans text-base tnum">{rate(deal.boardRatePerKg)}/{t('common.kg')}</span>}
                />
                {deal.agreedRatePerKg && (
                  <LedgerRow
                    label={t('deal.agreedTitle')}
                    sub={t('deal.agreedValue', { value: money(deal.agreedRatePerKg * deal.quantityKg) })}
                    value={`${rate(deal.agreedRatePerKg)}/${t('common.kg')}`}
                    emphasis
                  />
                )}
              </div>

              {deal.messages?.length > 0 && (
                <div className="space-y-2.5 border-t-2 border-rule px-4 py-3.5">
                  {deal.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`max-w-[85%] border-2 px-3 py-2 ${
                        message.from === 'trader'
                          ? 'ml-auto border-forest-700 bg-forest-50'
                          : 'border-ink bg-white'
                      }`}
                    >
                      <p className="text-sm leading-snug text-ink">{message.text}</p>
                      <p className="mt-1 text-xs text-ink-faint tnum">{message.at}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 border-t-2 border-ink px-4 py-3.5">
                <Field
                  label={t('buyer.deals.reply')}
                  icon={Send}
                  value={replies[deal.id] || ''}
                  onChange={(event) => setReplies((c) => ({ ...c, [deal.id]: event.target.value }))}
                  placeholder={t('buyer.deals.replyPlaceholder')}
                />
                <Button icon={Send} onClick={() => reply(deal)} disabled={!(replies[deal.id] || '').trim()}>
                  {t('deal.send')}
                </Button>

                {/* Quoting is the reply that matters, so it is its own action:
                    it writes the agreed rate the farmer's booking will carry. */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field
                    label={t('buyer.deals.quote')}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={quotes[deal.id] || ''}
                    onChange={(event) => setQuotes((c) => ({ ...c, [deal.id]: event.target.value }))}
                    placeholder={String(deal.boardRatePerKg)}
                  />
                  <div className="self-end">
                    <Button
                      variant="accent"
                      icon={Handshake}
                      onClick={() => quote(deal)}
                      disabled={!(quotes[deal.id] || '').trim()}
                    >
                      {t('buyer.deals.sendQuote')}
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <SectionHead 
        level="group" 
        title={t('buyer.inbound.shipments')}
        action={
          <Button full={false} variant="secondary" icon={RefreshCw} onClick={loadInbound} busy={loading}>
            {t('dispatch.refresh')}
          </Button>
        }
      />

      {loading ? (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-2xl text-ink-faint">{t('common.loading')}</p>
        </div>
      ) : inboundShipments.length === 0 ? (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('buyer.inbound.empty')}</p>
          <p className="mt-2 text-sm text-ink-soft">
            No shipments are currently heading to your location.
          </p>
        </div>
      ) : (
        <div className="stagger space-y-3">
          {inboundShipments.map((shipment) => (
            <article key={shipment.id} className="border-2 border-ink bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Truck className="h-5 w-5 shrink-0 text-forest-700" strokeWidth={2.25} aria-hidden="true" />
                  <p className="font-display text-2xl leading-none text-ink">
                    {t(`crops.${shipment.cropType}`)} · <span className="tnum">{number(shipment.quantityKg)} {t('common.kg')}</span>
                  </p>
                </div>
                <span className="border-2 border-ink bg-turmeric-300 px-2 py-1 text-sm font-bold leading-none text-ink">
                  {t(`tracking.status.${shipment.status}`)}
                </span>
              </div>

              <div className="px-4">
                <LedgerRow
                  label={t('buyer.inbound.from')}
                  sub={shipment.vehicle ? `${shipment.vehicle.vehicleNo} · ${shipment.vehicle.driverName}` : t('transport.track.waiting')}
                  value={<span className="font-sans text-base">{shipment.farmerName}</span>}
                />
                <LedgerRow
                  label={t('transport.route.pickup')}
                  value={<span className="font-sans text-base">{shipment.origin.label}</span>}
                />
                <LedgerRow
                  label={t('transport.route.drop')}
                  value={<span className="font-sans text-base">{shipment.destination.label}</span>}
                />
                {shipment.agreedRatePerKg && (
                  <LedgerRow
                    label={t('deal.agreedTitle')}
                    sub={`${rate(shipment.agreedRatePerKg)}/${t('common.kg')}`}
                    value={money(shipment.agreedRatePerKg * shipment.quantityKg)}
                    emphasis
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerInboundScreen;
