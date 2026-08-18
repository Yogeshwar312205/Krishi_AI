import React from 'react';
import { Truck } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { SectionHead } from '../../design/primitives/SectionHead';
import { LedgerRow } from '../../design/primitives/LedgerRow';
import { DemoStamp } from '../../design/primitives/DemoStamp';

/**
 * Produce already on its way to this buyer's mandi. Read-only: the buyer
 * reacts to these, they don't create them — the farmer's booking and the
 * driver's acceptance are what generate a shipment.
 */
export const BuyerInboundScreen = () => {
  const inboundShipments = useAppStore((state) => state.inboundShipments);
  const { t, number } = useT();

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead level="screen" title={t('buyer.inbound.title')} />

      {inboundShipments.length === 0 ? (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('buyer.inbound.empty')}</p>
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
                  {shipment.status}
                </span>
              </div>

              <div className="px-4">
                <LedgerRow
                  label={t('buyer.inbound.from')}
                  sub={`${shipment.vehicleNo} · ${shipment.driverName}`}
                  value={<span className="font-sans text-base">{shipment.farmerName}</span>}
                />
                <LedgerRow
                  label={t('buyer.inbound.eta')}
                  value={<span className="font-sans text-base">{shipment.eta}</span>}
                />
                <LedgerRow
                  label={t('buyer.inbound.value')}
                  sub={shipment.agreedRate}
                  value={shipment.estTotalValue}
                  emphasis
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {inboundShipments.length > 0 && <DemoStamp />}
    </div>
  );
};

export default BuyerInboundScreen;
