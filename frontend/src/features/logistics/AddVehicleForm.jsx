import React, { useState } from 'react';
import { Truck, MapPin, ChevronDown, Snowflake, Save, X } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { addFleetVehicle } from '../../services/api';
import { Field } from '../../design/primitives/Field';
import { ChoiceGrid } from '../../design/primitives/ChoiceGrid';
import { Button } from '../../design/primitives/Button';
import { BASE_LOCATIONS } from './baseLocations';

const VEHICLE_TYPES = ['Refrigerated Van', 'Heavy Freighter', 'E-Pickup', 'Mini Truck'];

const EMPTY = {
  vehicleNo: '', driverName: '', driverPhone: '',
  vehicleType: VEHICLE_TYPES[0], capacityKg: '', ratePerKm: '',
  isRefrigerated: 'yes', baseId: BASE_LOCATIONS[0].id,
};

/**
 * Adds a truck to the fleet.
 *
 * The base is picked from a list of real places rather than typed, because a
 * vehicle's position is not decoration here — it is the first stop of its route
 * and every insertion cost is measured from it. A free-text base would give us
 * a truck we cannot rank, which the dispatch screen would then have to explain
 * away. Better to only ever accept a location we actually know.
 */
export const AddVehicleForm = ({ onDone, onCancel }) => {
  const { t } = useT();
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (event) =>
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const base = BASE_LOCATIONS.find((b) => b.id === draft.baseId) || BASE_LOCATIONS[0];
    try {
      await addFleetVehicle({
        vehicleNo: draft.vehicleNo,
        driverName: draft.driverName,
        driverPhone: draft.driverPhone,
        vehicleType: draft.vehicleType,
        capacityKg: Number(draft.capacityKg),
        ratePerKm: Number(draft.ratePerKm),
        isRefrigerated: draft.isRefrigerated === 'yes',
        baseLocation: base.label,
        baseCoords: base.coordinates,
      });
      setDraft(EMPTY);
      await onDone();
    } catch (err) {
      setError(err?.response?.data?.message || t('dispatch.addVehicleFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="detail-enter space-y-4 border-2 border-ink bg-white p-4">
      {error && <p className="notice notice-bad" role="alert">{error}</p>}

      <Field
        label={t('dispatch.vehicleNumber')} icon={Truck} name="vehicleNo"
        value={draft.vehicleNo} onChange={update} placeholder="MH 15 GH 4921" required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('dispatch.driverName')} name="driverName"
          value={draft.driverName} onChange={update} required
        />
        <Field
          label={t('dispatch.driverPhone')} name="driverPhone" type="tel"
          value={draft.driverPhone} onChange={update} placeholder="+91 98230 11223"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="vehicle-type">{t('dispatch.vehicleType')}</label>
        <div className="relative flex items-center">
          <Truck className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
          <select
            id="vehicle-type" name="vehicleType" value={draft.vehicleType} onChange={update}
            className="field field-icon cursor-pointer appearance-none pr-11"
          >
            {VEHICLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('dispatch.capacity')} type="number" inputMode="numeric" name="capacityKg"
          value={draft.capacityKg} onChange={update} placeholder="3500" min="1" required
        />
        <Field
          label={t('dispatch.ratePerKm')} type="number" inputMode="numeric" name="ratePerKm"
          value={draft.ratePerKm} onChange={update} placeholder="52" min="1" required
        />
      </div>

      <ChoiceGrid
        label={t('dispatch.isCold')} columns={2} value={draft.isRefrigerated}
        onChange={(next) => setDraft((current) => ({ ...current, isRefrigerated: next }))}
        options={[
          { id: 'yes', label: t('common.yes'), icon: Snowflake },
          { id: 'no', label: t('common.no') },
        ]}
      />

      <div>
        <label className="field-label" htmlFor="vehicle-base">{t('dispatch.base')}</label>
        <div className="relative flex items-center">
          <MapPin className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
          <select
            id="vehicle-base" name="baseId" value={draft.baseId} onChange={update}
            className="field field-icon cursor-pointer appearance-none pr-11"
          >
            {BASE_LOCATIONS.map((base) => (
              <option key={base.id} value={base.id}>{base.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <p className="mt-1.5 text-sm text-ink-soft">{t('dispatch.baseWhy')}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" icon={X} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" icon={Save} busy={busy}>{t('dispatch.addVehicle')}</Button>
      </div>
    </form>
  );
};

export default AddVehicleForm;
