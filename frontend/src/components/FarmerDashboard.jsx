import React, { useState } from 'react';
import { 
  Sprout, 
  TrendingUp, 
  Store, 
  Calculator, 
  Truck, 
  Bell, 
  ArrowRight, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  Zap,
  PhoneCall,
  ShieldCheck
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const FarmerDashboard = () => {
  const { 
    setActiveTab, 
    cropDetails, 
    setCropDetails,
    bookings, 
    buyerPostings
  } = useAppStore();

  const [acceptedBids, setAcceptedBids] = useState([]);

  const handleAcceptBid = (bidId) => {
    setAcceptedBids((prev) => [...prev, bidId]);
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* FARMER HERO BANNER */}
      <section className="bg-gradient-to-br from-forest-900 via-forest-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Welcome Details */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-extrabold text-emerald-300">
              <Sprout className="h-4 w-4 text-emerald-400" />
              <span>Farmer Workstation • Nashik APMC Circle</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              Kisan Market Intelligence & Net Profit Hub
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl">
              Monitor real-time Agmarknet mandi rates, optimize cold-chain logistics dispatch, and bypass middlemen by connecting directly with verified APMC buyers.
            </p>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('forecasting')}
                className="btn-forest-primary px-5 py-3 text-xs flex items-center gap-2 shadow-lg"
              >
                <TrendingUp className="h-4 w-4" />
                <span>30-Day Price Forecast</span>
              </button>

              <button
                onClick={() => setActiveTab('mandi-comparison')}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs flex items-center gap-2 transition-all"
              >
                <Store className="h-4 w-4 text-emerald-400" />
                <span>Compare 16 APMC Mandis</span>
              </button>

              <button
                onClick={() => setActiveTab('logistics')}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Truck className="h-4 w-4" />
                <span>Book Cold-Chain Truck</span>
              </button>
            </div>
          </div>

          {/* Right Live Crop & Price Indicator Card */}
          <div className="lg:col-span-5 bg-white/10 border border-white/15 rounded-3xl p-5 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-extrabold text-emerald-300">My Crop In Focus</span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                Agmarknet Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-black/20 border border-white/10 space-y-1">
                <span className="text-slate-400 font-medium">Selected Crop</span>
                <div className="font-extrabold text-base text-white">{cropDetails.cropType}</div>
                <select
                  value={cropDetails.cropType}
                  onChange={(e) => setCropDetails({ cropType: e.target.value })}
                  className="w-full bg-slate-800 text-white text-[11px] font-bold rounded-lg px-2 py-1 border border-slate-700 outline-none mt-1 cursor-pointer"
                >
                  {['Tomato', 'Potato', 'Onion', 'Wheat', 'Rice', 'Mango', 'Banana'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-black/20 border border-white/10 space-y-1">
                <span className="text-slate-400 font-medium">Harvest Batch</span>
                <div className="font-extrabold text-base text-emerald-400">{cropDetails.quantityKg} kg</div>
                <div className="text-[11px] text-amber-300 font-semibold mt-1">High Sensitivity</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-200 font-semibold">Peak Mandi Today</div>
                <div className="text-sm font-black text-white">Vashi APMC • ₹48/kg</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-emerald-200 font-semibold">Est Net Gain</div>
                <div className="text-sm font-black text-emerald-300">+₹25,000</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* MANDI PRICE COMPARISON & NET RETURN QUICK WIDGET */}
      <section className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-forest-900 tracking-tight">
                Multi-Mandi Net Return Comparison ({cropDetails.cropType})
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Calculates your true profit after subtracting freight charges, diesel tariffs, and mandi commissions.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('mandi-comparison')}
              className="text-xs font-extrabold text-forest-700 hover:underline flex items-center gap-1"
            >
              <span>View All 16 Mandis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="furrow-divider" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Vashi APMC', rate: '₹48/kg', dist: '165 km', cost: '₹8,500', profit: '₹1,11,500', isBest: true },
            { name: 'Gultekdi APMC (Pune)', rate: '₹44/kg', dist: '210 km', cost: '₹10,200', profit: '₹99,800', isBest: false },
            { name: 'Nashik Main Mandi', rate: '₹38/kg', dist: '15 km', cost: '₹1,800', profit: '₹93,200', isBest: false },
            { name: 'Pimpalgaon APMC', rate: '₹39/kg', dist: '35 km', cost: '₹2,500', profit: '₹95,000', isBest: false },
          ].map((m, idx) => (
            <div 
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                m.isBest 
                  ? 'bg-gradient-to-br from-emerald-50 to-forest-50 border-emerald-300 shadow-md ring-2 ring-emerald-500/20' 
                  : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold text-forest-900">{m.name}</span>
                {m.isBest && (
                  <span className="text-[10px] font-black badge-turmeric px-2 py-0.5 rounded-full">
                    ★ Highest Return
                  </span>
                )}
              </div>

              <div className="py-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Mandi Rate:</span>
                  <strong className="text-slate-900">{m.rate}</strong>
                </div>

                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Transit Distance:</span>
                  <span className="text-slate-700">{m.dist}</span>
                </div>

                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Est. Freight Cost:</span>
                  <span className="text-rose-600 font-bold">{m.cost}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Net Profit:</span>
                  <span className="text-base font-black text-emerald-700">{m.profit}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('logistics')}
                className="w-full mt-1 py-1.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-[11px] transition-all text-center"
              >
                Ship to {m.name.split(' ')[0]}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* DIRECT APMC BUYER PROCUREMENT OFFERS FOR FARMERS */}
      <section className="space-y-4">
        <div className="space-y-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
              <Store className="h-4 w-4 text-emerald-600" />
              <span>Direct Mandi Buyer Connection</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-forest-900 tracking-tight">
              Verified APMC Buyer Procurement Offers
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Accept direct purchase contracts from registered APMC commission merchants.
            </p>
          </div>
          <div className="furrow-divider" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buyerPostings.map((bid) => {
            const isAccepted = acceptedBids.includes(bid.id);

            return (
              <div key={bid.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-forest-900">{bid.mandiName}</span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      {bid.expiresIn} Left
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-black text-emerald-800">{bid.cropType} • {bid.grade}</div>
                    <div className="text-xs text-slate-500 font-medium">Buyer: {bid.traderName}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between font-medium text-slate-600">
                      <span>Offered Buying Price:</span>
                      <strong className="text-emerald-700 font-extrabold text-sm">₹{bid.offeredPricePerKg} / kg</strong>
                    </div>

                    <div className="flex justify-between font-medium text-slate-600">
                      <span>Required Volume:</span>
                      <strong className="text-slate-800">{bid.requiredQuantityKg.toLocaleString()} kg</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  {isAccepted ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Offer Accepted! Buyer Contacted</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcceptBid(bid.id)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Accept Direct Deal (₹{bid.offeredPricePerKg}/kg)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ACTIVE SHIPMENTS & BOOKINGS SUMMARY */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-white">My Active Dispatches & Cold-Chain Vehicles</h3>
              <p className="text-xs text-slate-400 font-medium">Real-time status of your crops en route to mandis.</p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('bookings')}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <span>All Bookings</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((b) => (
            <div key={b.id} className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-emerald-400 text-sm">{b.id}</span>
                  <span className="text-slate-300 font-medium">• {b.cropType} ({b.quantityKg} kg)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30">
                  {b.status}
                </span>
              </div>

              <div className="text-slate-300 space-y-1">
                <div>From: <strong className="text-white">{b.origin}</strong></div>
                <div>To: <strong className="text-emerald-300">{b.destination}</strong></div>
                <div>Vehicle: {b.vehicleNo} ({b.vehicleType})</div>
                <div>Driver: {b.driverName} ({b.driverPhone})</div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block">Est Arrival</span>
                  <span className="font-bold text-white">{b.estArrival}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Net Expected</span>
                  <span className="font-black text-emerald-400 text-sm">{b.netProfit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
