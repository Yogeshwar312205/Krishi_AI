import React, { useState } from 'react';
import {
  Sprout, Scale, CalendarDays, MapPin, Snowflake, Check, LocateFixed, Loader2,
} from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useT } from '../../../i18n/useT';
import { CROP_OPTIONS } from '../../../utils/constants';
import { SectionHead } from '../../../design/primitives/SectionHead';
import { Field } from '../../../design/primitives/Field';
import { Button } from '../../../design/primitives/Button';

/**
 * The four facts every other screen is computed from.
 *
 * Today's verdict, the mandi comparison, the freight estimate and the cold-chain
 * suggestion all read `cropDetails` — and until this screen existed there was no
 * way for a farmer to set any of it. The app opened on a hardcoded 2,500 kg of
 * tomatoes and stayed there.
 *
 * Deliberately four questions and no more. Each one changes a number the farmer
 * will see; anything that would not is not asked.
 */

/* Crops that need a cold vehicle. Drives the suggestion, not a hidden setting. */
const PERISHABLE = new Set(['Tomato', 'Mango', 'Banana']);

export const CropScreen = () => {
  const cropDetails = useAppStore((state) => state.cropDetails);
  const setCropDetails = useAppStore((state) => state.setCropDetails);
  const farmerAddress = useAppStore((state) => state.farmerAddress);
  const farmerOrigin = useAppStore((state) => state.farmerOrigin);
  const setFarmerOrigin = useAppStore((state) => state.setFarmerOrigin);
  const { t, number } = useT();

  const [draft, setDraft] = useState({
    cropType: cropDetails.cropType,
    quantityKg: String(cropDetails.quantityKg),
    harvestTime: cropDetails.harvestTime,
    address: farmerAddress,
  });
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const isPerishable = PERISHABLE.has(draft.cropType);

  const useMyLocation = () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError(t('crop.locationFailed'));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        /*
         * No reverse geocoding: that is a paid API call and a round trip on a
         * connection we cannot count on, to produce a string the farmer can
         * type faster themselves. The coordinates are what routing needs; the
         * address is only ever shown back to the person who wrote it.
         */
        setFarmerOrigin([longitude, latitude], draft.address);
        setLocating(false);
      },
      () => {
        setLocationError(t('crop.locationFailed'));
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const save = (event) => {
    event.preventDefault();

    // A blank or nonsense quantity would silently zero out every rupee figure
    // downstream, so it falls back to what was already stored.
    const quantity = Math.max(0, Number(draft.quantityKg) || 0) || cropDetails.quantityKg;

    setCropDetails({
      cropType: draft.cropType,
      quantityKg: quantity,
      harvestTime: draft.harvestTime,
      temperatureSensitivity: PERISHABLE.has(draft.cropType) ? 'High' : 'Normal',
    });
    setFarmerOrigin(farmerOrigin, draft.address.trim() || farmerAddress);
    setDraft((current) => ({ ...current, quantityKg: String(quantity) }));
    setSaved(true);
  };

  return (
    <div className="pt-4 pb-4">
      <form onSubmit={save} className="space-y-5">
        <SectionHead level="screen" title={t('crop.title')} />

        {/* ---- Which crop ---- */}
        <fieldset>
          <legend className="field-label">{t('crop.which')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CROP_OPTIONS.map((crop) => {
              const isActive = draft.cropType === crop;
              return (
                <button
                  key={crop}
                  type="button"
                  onClick={() => update('cropType', crop)}
                  aria-pressed={isActive}
                  className={`
                    lift flex min-h-[3.5rem] items-center justify-center gap-2 border-2 px-2 py-3
                    ${isActive
                      ? 'border-ink bg-forest-700 text-white'
                      : 'border-rule bg-white text-ink-soft hover:border-ink'}
                  `}
                >
                  <Sprout
                    className={`h-5 w-5 shrink-0 ${isActive ? 'text-turmeric-300' : 'text-ink-faint'}`}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                  <span className={`text-base leading-none ${isActive ? 'font-bold' : 'font-semibold'}`}>
                    {t(`crops.${crop}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/*
          The cold-vehicle note is attached to the crop choice rather than being
          a switch of its own. It is a consequence, not a decision — and stating
          it here is what stops the Transport screen's cold-vehicle upcharge
          from arriving as a surprise.
        */}
        {isPerishable && (
          <p className="detail-enter flex items-start gap-2.5 border-l-4 border-forest-700 bg-forest-50 px-3.5 py-3">
            <Snowflake className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" strokeWidth={2.25} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-bold text-ink">{t('crop.spoils')}</span>
              <span className="block text-sm text-ink-soft">{t('crop.spoilsWhy')}</span>
            </span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('crop.howMuch')}
            icon={Scale}
            type="number"
            inputMode="numeric"
            min="1"
            step="50"
            value={draft.quantityKg}
            onChange={(event) => update('quantityKg', event.target.value)}
            hint={t('crop.quantityHint')}
          />

          <Field
            label={t('crop.harvest')}
            icon={CalendarDays}
            type="date"
            value={draft.harvestTime}
            onChange={(event) => update('harvestTime', event.target.value)}
          />
        </div>

        {/* ---- Where ---- */}
        <div className="space-y-2">
          <Field
            label={t('crop.where')}
            icon={MapPin}
            value={draft.address}
            onChange={(event) => update('address', event.target.value)}
            placeholder={t('crop.village')}
            autoComplete="address-level2"
          />

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex items-center gap-2 text-base font-bold text-forest-700 underline underline-offset-2 disabled:opacity-60"
          >
            {locating
              ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" strokeWidth={2.25} aria-hidden="true" />
              : <LocateFixed className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />}
            {locating ? t('crop.locating') : t('crop.useLocation')}
          </button>

          {locationError && (
            <p className="notice notice-bad" role="alert">{locationError}</p>
          )}
        </div>

        <Button type="submit" icon={Check}>{t('crop.saveCrop')}</Button>

        {saved && (
          <p className="notice notice-good detail-enter" role="status">
            <Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            <span>
              {t('crop.saved')}{' '}
              <span className="tnum">
                {t(`crops.${cropDetails.cropType}`)} · {number(cropDetails.quantityKg)} {t('common.kg')}
              </span>
            </span>
          </p>
        )}
      </form>
    </div>
  );
};

export default CropScreen;
