import React, { useState } from 'react';
import { Truck, Plus, CheckCircle2, ShieldCheck, Thermometer, MapPin } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const RegisterVehicleModal = ({ isOpen, onClose }) => {
  const { addRegisteredVehicle } = useAppStore();

  const [formData, setFormData] = useState({
    driverName: 'Suresh Shinde',
    driverPhone: '+91 98230 11223',
    vehicleNo: 'MH 15 GH 8899',
    vehicleType: 'Refrigerated Van',
    capacityKg: 3500,
    ratePerKm: 18,
    isRefrigerated: true,
    baseLocation: 'Nashik APMC Circle',
    availableFrom: new Date().toISOString().split('T')[0],
    availableTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newVehicle = {
      id: 'VEH-' + Math.floor(100 + Math.random() * 900),
      driverName: formData.driverName,
      driverPhone: formData.driverPhone,
      vehicleNo: formData.vehicleNo,
      vehicleType: formData.vehicleType,
      capacityKg: Number(formData.capacityKg),
      ratePerKm: Number(formData.ratePerKm),
      isRefrigerated: formData.isRefrigerated,
      baseLocation: formData.baseLocation,
      availableFrom: formData.availableFrom,
      availableTo: formData.availableTo,
      isAvailable: true,
      tempSensor: formData.isRefrigerated ? '10°C Active Cooling' : 'Ventilated Cargo'
    };

    addRegisteredVehicle(newVehicle);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Register Driver Vehicle Details</h3>
              <p className="text-[11px] text-slate-500 font-medium">Add your truck specs to receive Uber-like date booking requests from farmers.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-lg font-black text-forest-900">Vehicle Registered Successfully!</h4>
            <p className="text-xs text-slate-600 font-medium">
              Your vehicle <strong className="text-slate-900">{formData.vehicleNo}</strong> is now live for farmer date bookings.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Driver Name</label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Mobile Phone (+91)</label>
                <input
                  type="text"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Vehicle Reg. No.</label>
                <input
                  type="text"
                  value={formData.vehicleNo}
                  onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                  placeholder="e.g. MH 15 GH 4921"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Vehicle Category</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="Refrigerated Van">Refrigerated Cold Van</option>
                  <option value="Heavy Freighter">Heavy Multi-Axle Freighter</option>
                  <option value="E-Pickup Express">E-Pickup Express</option>
                  <option value="Mini Truck">Ventilated Mini Truck</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Payload Cap (kg)</label>
                <input
                  type="number"
                  value={formData.capacityKg}
                  onChange={(e) => setFormData({ ...formData, capacityKg: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Freight Rate (₹/km)</label>
                <input
                  type="number"
                  value={formData.ratePerKm}
                  onChange={(e) => setFormData({ ...formData, ratePerKm: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Refrigeration</label>
                <select
                  value={formData.isRefrigerated ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isRefrigerated: e.target.value === 'true' })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="true">Yes (Active Cold Chain)</option>
                  <option value="false">No (Ventilated)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Base Location / Hub</label>
              <input
                type="text"
                value={formData.baseLocation}
                onChange={(e) => setFormData({ ...formData, baseLocation: e.target.value })}
                placeholder="e.g. Nashik APMC Hub"
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Save & Publish Vehicle</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
