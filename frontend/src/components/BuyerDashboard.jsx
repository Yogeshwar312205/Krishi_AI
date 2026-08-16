import React, { useState } from 'react';
import {
  Store,
  Plus,
  Trash2,
  Truck,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  MapPin,
  Building2,
  UserCheck,
  Clock,
  DollarSign,
  BarChart3,
  AlertCircle,
  X,
  Wheat
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { CROP_OPTIONS } from '../utils/constants';
import { Select } from './ui/Select';

const BUYER_MANDI_OPTIONS = [
  { value: 'Vashi Wholesale APMC', label: 'Vashi Wholesale APMC' },
  { value: 'Nashik Main APMC', label: 'Nashik Main APMC' },
  { value: 'Gultekdi APMC (Pune)', label: 'Gultekdi APMC (Pune)' },
  { value: 'Nagpur APMC', label: 'Nagpur APMC' },
];

export const BuyerDashboard = () => {
  const { 
    buyerPostings, 
    addBuyerPosting, 
    deleteBuyerPosting, 
    inboundShipments,
    setActiveTab 
  } = useAppStore();

  const [showPostModal, setShowPostModal] = useState(false);
  const [formData, setFormData] = useState({
    cropType: 'Tomato',
    grade: 'Grade-A Premium Red',
    offeredPricePerKg: 46,
    requiredQuantityKg: 5000,
    mandiName: 'Vashi Wholesale APMC'
  });

  const handleCreatePosting = (e) => {
    e.preventDefault();
    const newPost = {
      id: 'BID-' + Math.floor(100 + Math.random() * 900),
      cropType: formData.cropType,
      grade: formData.grade,
      offeredPricePerKg: Number(formData.offeredPricePerKg),
      requiredQuantityKg: Number(formData.requiredQuantityKg),
      receivedQuantityKg: 0,
      mandiName: formData.mandiName,
      traderName: 'Rajesh Mehta (Mehta Produce Corp)',
      traderPhone: '+91 98200 55443',
      status: 'Active Procurement',
      expiresIn: '7 Days'
    };
    addBuyerPosting(newPost);
    setShowPostModal(false);
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* APMC BUYER / MERCHANT HEADER */}
      <section className="bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 border-b border-white/10 pb-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center font-black text-2xl shadow-lg">
              <Store className="h-8 w-8 text-white" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-display text-2xl font-semibold text-white">Rajesh Mehta</h1>
                <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                  APMC Licensed Commission Merchant
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Company: <strong className="text-white">Mehta Produce Corp • Lic #APMC-MH-8842</strong>
              </p>
              <div className="flex items-center space-x-4 text-xs text-slate-400 font-medium mt-1">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Primary Mandi: Vashi Wholesale APMC Market</span>
                <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Secondary: Nashik APMC</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPostModal(true)}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 self-start lg:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Post New Produce Buying Order</span>
          </button>
        </div>

        {/* Wholesale Procurement Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10 text-xs">
          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Today's Procurement</span>
              <Building2 className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-300">14.5 Tonnes</div>
            <div className="text-[10px] text-emerald-400 font-bold">Tomato & Onion Influx</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Active Buying Orders</span>
              <Store className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white">{buyerPostings.length} Bids Posted</div>
            <div className="text-[10px] text-slate-300 font-medium">Accepting Farmers</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Inbound Truck Arrivals</span>
              <Truck className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-xl font-black text-blue-300">{inboundShipments.length} Trucks En Route</div>
            <div className="text-[10px] text-blue-300 font-bold">ETA within 4 Hours</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Avg Resale Margin</span>
              <BarChart3 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-300">+14.2%</div>
            <div className="text-[10px] text-slate-300 font-medium">Urban Retail Resale</div>
          </div>
        </div>
      </section>

      {/* POST NEW PROCUREMENT OFFER MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Store className="h-5 w-5 text-amber-600" />
                <h3 className="font-display text-lg font-semibold text-slate-900">Post APMC Buying Rate</h3>
              </div>
              <button onClick={() => setShowPostModal(false)} className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePosting} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Crop Type</label>
                  <Select
                    icon={Wheat}
                    tone="slate"
                    value={formData.cropType}
                    onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                    options={CROP_OPTIONS.map((c) => ({ value: c, label: c }))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Offered Rate (₹ / kg)</label>
                  <input
                    type="number"
                    value={formData.offeredPricePerKg}
                    onChange={(e) => setFormData({ ...formData, offeredPricePerKg: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Quality Grade</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="e.g. Grade-A Export Quality"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Target Volume (kg)</label>
                  <input
                    type="number"
                    value={formData.requiredQuantityKg}
                    onChange={(e) => setFormData({ ...formData, requiredQuantityKg: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Target APMC Mandi</label>
                  <Select
                    icon={Store}
                    tone="slate"
                    value={formData.mandiName}
                    onChange={(e) => setFormData({ ...formData, mandiName: e.target.value })}
                    options={BUYER_MANDI_OPTIONS}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-md"
                >
                  Publish Buying Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE APMC BUYING POSTINGS TABLE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-forest-200/80 pb-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider mb-0.5">
              <Store className="h-4 w-4 text-amber-600" />
              <span>APMC Trading Desk</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-forest-900 tracking-tight">
              My Active Produce Buying Orders & Rates
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Farmers in Nashik and surrounding districts view these rates to send crops directly to your shop.
            </p>
          </div>

          <button
            onClick={() => setShowPostModal(true)}
            className="btn-forest-primary px-4 py-2 text-xs flex items-center gap-1.5 shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Buying Offer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buyerPostings.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-800 text-xs">{p.id} • {p.mandiName}</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    {p.status}
                  </span>
                </div>

                <div>
                  <div className="text-base font-black text-slate-900">{p.cropType}</div>
                  <div className="text-xs text-slate-500 font-semibold">{p.grade}</div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Buying Price Offered:</span>
                    <strong className="text-amber-900 text-sm font-black">₹{p.offeredPricePerKg} / kg</strong>
                  </div>

                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Volume Required:</span>
                    <span className="text-slate-900 font-bold">{p.requiredQuantityKg.toLocaleString()} kg</span>
                  </div>

                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Received So Far:</span>
                    <span className="text-emerald-700 font-extrabold">{p.receivedQuantityKg.toLocaleString()} kg</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Merchant: {p.traderName.split(' ')[0]}</span>
                <button
                  onClick={() => deleteBuyerPosting(p.id)}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                  title="Delete Posting"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INBOUND FARMER SHIPMENTS ARRIVING AT BUYER MANDI */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-white">Inbound Farmer Consignments & Truck Tracking</h3>
              <p className="text-xs text-slate-400 font-medium">Produce trucks currently en route to your APMC shop.</p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('logistics')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <span>Track on VRP Map</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inboundShipments.map((s) => (
            <div key={s.id} className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-amber-400 text-sm">{s.id}</span>
                  <span className="text-slate-300 font-medium">• {s.cropType} ({s.quantityKg} kg)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-400/30">
                  {s.status}
                </span>
              </div>

              <div className="text-slate-300 space-y-1">
                <div>Farmer Supplier: <strong className="text-white">{s.farmerName}</strong></div>
                <div>Transporter Vehicle: {s.vehicleNo} ({s.driverName} • {s.driverPhone})</div>
                <div>Dest APMC: <span className="text-amber-300 font-bold">{s.mandiName}</span></div>
                <div>ETA: <strong className="text-emerald-400">{s.eta}</strong></div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block">Agreed Purchase Rate</span>
                  <span className="font-bold text-amber-300 text-sm">{s.agreedRate}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Deal Value</span>
                  <span className="font-black text-emerald-400 text-sm">{s.estTotalValue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
