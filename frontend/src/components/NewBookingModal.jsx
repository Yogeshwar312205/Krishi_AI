import React, { useState } from 'react';
import { 
  X, 
  Truck, 
  MapPin, 
  Sprout, 
  Thermometer, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  User,
  Phone
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const NewBookingModal = ({ isOpen, onClose, initialData = {} }) => {
  const { addBooking, setActiveTab, cropDetails } = useAppStore();

  const [formData, setFormData] = useState({
    cropType: initialData.cropType || cropDetails.cropType || 'Tomato',
    quantityKg: initialData.quantityKg || cropDetails.quantityKg || 2500,
    origin: initialData.origin || 'Nashik Central Farm HQ',
    destination: initialData.destination || 'Vashi Wholesale APMC',
    vehicleType: 'Refrigerated Van',
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98765 12345'
  });

  if (!isOpen) return null;

  // Rate estimates
  const ratePerKg = formData.cropType === 'Tomato' ? 48 : formData.cropType === 'Onion' ? 35 : 40;
  const distKm = formData.destination.includes('Vashi') ? 180 : formData.destination.includes('Mumbai') ? 220 : 120;
  const freightRatePerKm = formData.vehicleType.includes('Heavy') ? 42 : formData.vehicleType.includes('Refrigerated') ? 32 : 22;
  
  const grossRevenue = formData.quantityKg * ratePerKg;
  const transportCost = distKm * freightRatePerKm;
  const netProfit = grossRevenue - transportCost;

  const handleSubmit = (e) => {
    e.preventDefault();

    const dispatchId = 'DISP-' + Math.floor(1000 + Math.random() * 9000);
    const newDispatch = {
      id: dispatchId,
      cropType: formData.cropType,
      quantityKg: Number(formData.quantityKg),
      driverName: formData.driverName,
      driverPhone: formData.driverPhone,
      vehicleType: formData.vehicleType,
      vehicleNo: `MH ${Math.floor(10 + Math.random() * 89)} GH ${Math.floor(1000 + Math.random() * 8999)}`,
      origin: formData.origin,
      destination: formData.destination,
      status: 'In Transit',
      dispatchTime: 'Just Now',
      estArrival: 'In 3.5 Hours',
      temperature: formData.vehicleType.includes('Refrigerated') ? '11°C (Active Cooling)' : 'Ventilated Cargo',
      expectedRevenue: `₹${grossRevenue.toLocaleString('en-IN')}`,
      transportCost: `₹${transportCost.toLocaleString('en-IN')}`,
      netProfit: `₹${netProfit.toLocaleString('en-IN')}`
    };

    addBooking(newDispatch);
    onClose();
    setActiveTab('bookings');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-forest-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-xl bg-forest-600 text-white flex items-center justify-center font-bold shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-forest-900">Book Cold-Chain Vehicle</h3>
              <p className="text-xs text-slate-500 font-semibold">VRP Optimized Dispatch & APMC Market Route</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          {/* Crop & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold block">Crop Type</label>
              <select
                value={formData.cropType}
                onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-forest-500 bg-white"
              >
                {['Tomato', 'Potato', 'Onion', 'Wheat', 'Rice', 'Mango', 'Banana'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-bold block">Quantity (in kg)</label>
              <input
                type="number"
                value={formData.quantityKg}
                onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
                placeholder="2500"
                min="100"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-forest-500"
              />
            </div>
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold block">Origin Farm Location</label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-emerald-600 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-forest-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-bold block">Destination APMC Mandi</label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-forest-500 bg-white"
              >
                <option value="Vashi Wholesale APMC">Vashi Wholesale APMC (High Return)</option>
                <option value="Mumbai Central APMC">Mumbai Central APMC</option>
                <option value="Pune Wholesale Mandi">Pune Wholesale Mandi</option>
                <option value="Nagpur APMC Hub">Nagpur APMC Hub</option>
              </select>
            </div>
          </div>

          {/* Vehicle Type Choice */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold block uppercase text-[10px] tracking-wider">
              Select Fleet Vehicle
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'Refrigerated Van', cap: '3.5 Ton', desc: '10°C Cold Storage' },
                { type: 'Heavy Freighter', cap: '10 Ton', desc: 'Ventilated Bulk' },
                { type: 'E-Pickup Express', cap: '1.5 Ton', desc: 'Local Zero Emission' },
              ].map((v) => {
                const isSelected = formData.vehicleType === v.type;
                return (
                  <button
                    key={v.type}
                    type="button"
                    onClick={() => setFormData({ ...formData, vehicleType: v.type })}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-forest-50 border-forest-500 ring-2 ring-forest-500/20 text-forest-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-extrabold text-[11px]">{v.type}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{v.desc}</div>
                    <div className="text-[10px] font-bold text-emerald-700 mt-1">Cap: {v.cap}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Estimate Summary Banner */}
          <div className="p-4 rounded-2xl bg-forest-900 text-white space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Target Mandi Rate:</span>
              <strong className="text-emerald-400">₹{ratePerKg} / kg</strong>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">VRP Distance & Freight:</span>
              <strong className="text-slate-200">{distKm} km — ₹{transportCost.toLocaleString('en-IN')}</strong>
            </div>

            <div className="pt-2 border-t border-forest-800 flex justify-between items-center">
              <span className="font-black text-emerald-300">Est. Net Profit to Farmer:</span>
              <strong className="text-xl font-black text-emerald-400">₹{netProfit.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Confirm & Dispatch Vehicle</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
