import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Truck,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Thermometer,
  ArrowRight,
  Sparkles,
  Zap,
  PhoneCall,
  UserCheck,
  Wheat
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { CROP_OPTIONS } from '../utils/constants';
import { Select } from './ui/Select';

const TIME_SLOT_OPTIONS = [
  { value: 'Morning (06:00 AM - 10:00 AM)', label: 'Morning (06:00 AM - 10:00 AM)' },
  { value: 'Afternoon (01:00 PM - 05:00 PM)', label: 'Afternoon (01:00 PM - 05:00 PM)' },
  { value: 'Night Dispatch (09:00 PM - 01:00 AM)', label: 'Night Dispatch (09:00 PM - 01:00 AM)' },
  { value: 'Full Day Dedicated Rental', label: 'Full Day Dedicated Rental' },
];

export const DateVehicleBooking = () => {
  const {
    user,
    registeredVehicles,
    dateBookings,
    createDateBooking,
    cropDetails,
    farmerAddress,
    setActiveTab
  } = useAppStore();

  const [pickupDate, setPickupDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [timeSlot, setTimeSlot] = useState('Morning (06:00 AM - 10:00 AM)');
  const [cropType, setCropType] = useState(cropDetails.cropType || 'Tomato');
  const [quantityKg, setQuantityKg] = useState(cropDetails.quantityKg || 2500);
  const [origin, setOrigin] = useState(farmerAddress || 'Nashik Farm HQ, Maharashtra');
  const [destination, setDestination] = useState('Vashi Wholesale APMC, Navi Mumbai');

  const [selectedVehicleId, setSelectedVehicleId] = useState(registeredVehicles[0]?.id || 'VEH-101');
  const [requestSentMsg, setRequestSentMsg] = useState('');

  const selectedVehicle = registeredVehicles.find((v) => v.id === selectedVehicleId) || registeredVehicles[0];

  const handleBookVehicle = (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const estDistance = 165;
    const estFareVal = Math.round(estDistance * (selectedVehicle.ratePerKm || 18));
    
    const newBooking = {
      id: 'UBER-' + Math.floor(500 + Math.random() * 500),
      farmerName: user?.name || 'Guest Farmer',
      farmerPhone: user?.phone || '',
      pickupDate,
      timeSlot,
      cropType,
      quantityKg: Number(quantityKg),
      origin,
      destination,
      vehicleId: selectedVehicle.id,
      vehicleNo: selectedVehicle.vehicleNo,
      driverName: selectedVehicle.driverName,
      driverPhone: selectedVehicle.driverPhone,
      estDistanceKm: estDistance,
      estTotalFare: `₹${estFareVal.toLocaleString()}`,
      status: 'Pending Driver Acceptance',
      createdAt: 'Just Now'
    };

    createDateBooking(newBooking);
    setRequestSentMsg(`Booking request for ${pickupDate} sent to Driver ${selectedVehicle.driverName}!`);
    setTimeout(() => {
      setRequestSentMsg('');
    }, 4000);
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER BANNER */}
      <section className="bg-gradient-to-br from-forest-900 via-forest-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-extrabold text-emerald-300">
          <Truck className="h-4 w-4 text-emerald-400" />
          <span>On-Demand Agri Logistics • Date-Based Truck Dispatch</span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
          Book Cold-Chain Transport for Specific Harvest Dates
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
          Schedule temperature-controlled trucks on demand like Uber. Choose your exact pickup date, crop volume, and target mandi to match with available registered drivers.
        </p>
      </section>

      {/* SUCCESS CONFIRMATION BANNER */}
      {requestSentMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-6 w-6 text-emerald-100 shrink-0" />
          <div>
            <strong className="text-sm font-black block">Booking Request Sent Successfully!</strong>
            <span className="text-xs text-emerald-100 font-medium">{requestSentMsg}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT FORM: DATE & HARVEST PARAMETERS */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-forest-100 p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Calendar className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-black text-forest-900">1. Schedule Pickup Date & Time</h2>
          </div>

          <form onSubmit={handleBookVehicle} className="space-y-4 text-xs">
            
            <div className="space-y-1">
              <label className="font-extrabold text-slate-700 block uppercase tracking-wider">
                Select Pickup Date
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={pickupDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPickupDate(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-700 block uppercase tracking-wider">
                Time Window / Slot
              </label>
              <Select
                icon={Clock}
                tone="slate"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                options={TIME_SLOT_OPTIONS}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Crop Type</label>
                <Select
                  icon={Wheat}
                  tone="slate"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  options={CROP_OPTIONS.map((c) => ({ value: c, label: c }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Quantity (kg)</label>
                <input
                  type="number"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Farm Pickup Location</label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-forest-600 absolute left-3 top-3" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Destination APMC Mandi</label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-forest-50 border border-forest-100 space-y-2">
              <div className="flex justify-between text-xs font-bold text-forest-900">
                <span>Selected Vehicle:</span>
                <span className="text-emerald-700">{selectedVehicle?.vehicleNo}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Est. Rate:</span>
                <span>₹{selectedVehicle?.ratePerKm || 18} / km (~165 km)</span>
              </div>
              <div className="pt-2 border-t border-forest-200/60 flex justify-between items-center text-sm font-black text-forest-900">
                <span>Total Estimated Fare:</span>
                <span className="text-emerald-700 font-black">
                  ₹{Math.round(165 * (selectedVehicle?.ratePerKm || 18)).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Send Booking Request for {pickupDate}</span>
            </button>
          </form>
        </div>

        {/* RIGHT AVAILABLE REGISTERED DRIVER TRUCKS FOR DATE */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-forest-200/80 pb-3">
            <div>
              <h2 className="text-lg font-black text-forest-900">2. Select Registered Vehicle for {pickupDate}</h2>
              <p className="text-xs text-slate-600 font-medium">Verified drivers available for instant schedule assignment.</p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              {registeredVehicles.length} Trucks Available
            </span>
          </div>

          <div className="space-y-3">
            {registeredVehicles.map((v) => {
              const isSelected = selectedVehicleId === v.id;
              const estFare = Math.round(165 * v.ratePerKm);

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-forest-50 to-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-md ${
                      isSelected ? 'bg-emerald-600' : 'bg-slate-800'
                    }`}>
                      <Truck className="h-6 w-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-black text-forest-900">{v.vehicleNo}</h4>
                        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          {v.vehicleType}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 font-semibold">
                        Driver: <strong className="text-slate-900">{v.driverName}</strong> • {v.driverPhone}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium pt-0.5">
                        <span className="flex items-center gap-1">
                          <Thermometer className="h-3 w-3 text-emerald-600" />
                          <span>{v.tempSensor}</span>
                        </span>
                        <span>• Cap: {v.capacityKg.toLocaleString()} kg</span>
                        <span>• Hub: {v.baseLocation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Estimated Fare</div>
                      <div className="text-lg font-black text-emerald-700">₹{estFare.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500 font-medium">₹{v.ratePerKm} / km</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`mt-2 px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                        isSelected 
                          ? 'bg-emerald-600 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Selected</span>
                      ) : 'Select Truck'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* FARMER SCHEDULED DATE BOOKINGS LIST */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-black text-white">My Date-Scheduled Vehicle Bookings</h3>
              <p className="text-xs text-slate-400 font-medium">Track driver acceptance status for your harvest dates.</p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('bookings')}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <span>View All Waybills</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dateBookings.map((b) => (
            <div key={b.id} className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-emerald-400 text-sm">{b.id}</span>
                  <span className="text-slate-300 font-medium">• Date: <strong className="text-white">{b.pickupDate}</strong></span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  b.status === 'Accepted' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}>
                  {b.status}
                </span>
              </div>

              <div className="text-slate-300 space-y-1">
                <div>Time Slot: <span className="text-amber-300 font-bold">{b.timeSlot}</span></div>
                <div>Crop: {b.cropType} ({b.quantityKg} kg)</div>
                <div>Driver: <strong className="text-white">{b.driverName}</strong> ({b.driverPhone}) • Vehicle: {b.vehicleNo}</div>
                <div className="flex items-center gap-1">From: {b.origin} <ArrowRight className="h-3 w-3 inline text-slate-500" /> To: <strong className="text-emerald-300">{b.destination}</strong></div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Est Total Fare:</span>
                <span className="font-black text-emerald-400 text-sm">{b.estTotalFare}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
