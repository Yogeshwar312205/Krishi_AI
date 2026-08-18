import React, { useState } from 'react';
import { Truck, MapPin, ChevronDown, Plus, Snowflake, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { SectionHead } from '../../design/primitives/SectionHead';
import { Field } from '../../design/primitives/Field';
import { ChoiceGrid } from '../../design/primitives/ChoiceGrid';
import { Button } from '../../design/primitives/Button';
import { DemoStamp } from '../../design/primitives/DemoStamp';

const VEHICLE_TYPES = ['Refrigerated Van', 'Heavy Freighter', 'E-Pickup Express', 'Mini Truck'];

const EMPTY_DRAFT = {
  vehicleNo: '',
  vehicleType: VEHICLE_TYPES[0],
  capacityKg: '',
  ratePerKm: '',
  isRefrigerated: 'yes',
  baseLocation: '',
};

export const DriverVehiclesScreen = () => {
  const user = useAppStore((state) => state.user);
  const registeredVehicles = useAppStore((state) => state.registeredVehicles);
  const addRegisteredVehicle = useAppStore((state) => state.addRegisteredVehicle);
  const { t, number, money } = useT();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const update = (event) => {
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const isRefrigerated = draft.isRefrigerated === 'yes';

    addRegisteredVehicle({
      id: 'VEH-' + Math.floor(100 + Math.random() * 900),
      driverName: user?.name || '',
      driverPhone: user?.phone || '',
      vehicleNo: draft.vehicleNo,
      vehicleType: draft.vehicleType,
      capacityKg: Number(draft.capacityKg) || 0,
      ratePerKm: Number(draft.ratePerKm) || 0,
      isRefrigerated,
      baseLocation: draft.baseLocation,
      isAvailable: true,
      tempSensor: isRefrigerated ? '10°C Active Cooling' : 'Ventilated Cargo',
    });

    setDraft(EMPTY_DRAFT);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead
        level="screen"
        title={t('driver.vehicles.title')}
        action={
          <Button full={false} icon={Plus} onClick={() => setShowForm((v) => !v)}>
            {t('driver.vehicles.add')}
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={submit} className="detail-enter space-y-4 border-2 border-ink bg-white p-4">
          <Field
            label={t('driver.vehicles.number')}
            icon={Truck}
            name="vehicleNo"
            value={draft.vehicleNo}
            onChange={update}
            placeholder="MH 15 GH 4921"
            required
          />

          <div>
            <label className="field-label" htmlFor="vehicle-type">{t('driver.vehicles.type')}</label>
            <div className="relative flex items-center">
              <Truck
                className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint"
                strokeWidth={2.25}
                aria-hidden="true"
              />
              <select
                id="vehicle-type"
                name="vehicleType"
                value={draft.vehicleType}
                onChange={update}
                className="field field-icon cursor-pointer appearance-none pr-11"
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('driver.vehicles.capacity')}
              type="number"
              inputMode="numeric"
              name="capacityKg"
              value={draft.capacityKg}
              onChange={update}
              placeholder="3500"
              min="0"
              required
            />
            <Field
              label={t('driver.vehicles.ratePerKm')}
              type="number"
              inputMode="numeric"
              name="ratePerKm"
              value={draft.ratePerKm}
              onChange={update}
              placeholder="52"
              min="0"
              required
            />
          </div>

          <ChoiceGrid
            label={t('driver.vehicles.isCold')}
            columns={2}
            value={draft.isRefrigerated}
            onChange={(next) => setDraft((current) => ({ ...current, isRefrigerated: next }))}
            options={[
              { id: 'yes', label: t('common.yes'), icon: Snowflake },
              { id: 'no', label: t('common.no') },
            ]}
          />

          <Field
            label={t('driver.vehicles.base')}
            icon={MapPin}
            name="baseLocation"
            value={draft.baseLocation}
            onChange={update}
            placeholder="Nashik APMC Hub"
            required
          />

          <Button type="submit" icon={Save}>{t('driver.vehicles.add')}</Button>
        </form>
      )}

      {registeredVehicles.length === 0 && !showForm && (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('driver.vehicles.empty')}</p>
        </div>
      )}

      {registeredVehicles.length > 0 && (
        <div className="stagger space-y-3">
          {registeredVehicles.map((vehicle) => (
            <article key={vehicle.id} className="border-2 border-ink bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
                <p className="font-display text-2xl leading-none tnum text-ink">{vehicle.vehicleNo}</p>
                <span
                  className={`border-2 border-ink px-2 py-1 text-sm font-bold leading-none ${
                    vehicle.isAvailable ? 'bg-forest-700 text-white' : 'bg-white text-ink-soft'
                  }`}
                >
                  {vehicle.isAvailable ? t('driver.vehicles.available') : t('driver.vehicles.unavailable')}
                </span>
              </div>

              <div className="space-y-2 px-4 py-3.5 text-base text-ink">
                <p className="font-semibold">{vehicle.vehicleType}</p>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
                  <span className="tnum">
                    {t('driver.vehicles.capacity')}: {number(vehicle.capacityKg)} {t('common.kg')}
                  </span>
                  <span className="tnum">{t('driver.vehicles.ratePerKm')}: {money(vehicle.ratePerKm)}/km</span>
                </p>
                <p className="flex items-center gap-2 text-ink-soft">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                  {vehicle.baseLocation}
                  {vehicle.isRefrigerated && (
                    <span className="inline-flex items-center gap-1 border-2 border-forest-700 bg-forest-50 px-2 py-0.5 text-sm font-bold text-forest-700">
                      <Snowflake className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                      {t('driver.vehicles.isCold')}
                    </span>
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {registeredVehicles.length > 0 && <DemoStamp />}
    </div>
  );
};

export default DriverVehiclesScreen;
