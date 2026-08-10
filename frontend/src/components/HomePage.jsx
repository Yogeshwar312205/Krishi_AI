import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Store, 
  Calculator, 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  BarChart3, 
  Bell, 
  MapPin, 
  CheckCircle2, 
  Navigation,
  Thermometer,
  Zap,
  Award,
  DollarSign
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const HomePage = () => {
  const { setActiveTab, cropDetails } = useAppStore();

  const fleetShowcase = [
    {
      id: 'fleet-1',
      title: 'Refrigerated Van (Cold Chain)',
      farmerName: 'Ramesh Singh',
      location: 'Nashik, Maharashtra',
      vehicleType: 'Refrigerated Van',
      capacity: '3,500 kg',
      crop: 'Tomato & Perishables',
      tempControl: '10°C - 14°C Active Cooling',
      impact: '+₹25,000 extra profit on Vashi APMC shipment',
      image: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=800',
      badge: 'Perishable Specialist',
      badgeColor: 'bg-emerald-500 text-white'
    },
    {
      id: 'fleet-2',
      title: 'Heavy Produce Freighter',
      farmerName: 'Sunita Patil',
      location: 'Nagpur, Maharashtra',
      vehicleType: 'Heavy Freighter',
      capacity: '10,000 kg',
      crop: 'Oranges & Bulk Onions',
      tempControl: 'Ventilated Cargo Container',
      impact: 'Saved 3.5 Hours via AI VRP Rerouting',
      image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800',
      badge: 'Inter-State Express',
      badgeColor: 'bg-blue-600 text-white'
    },
    {
      id: 'fleet-3',
      title: 'EV Pickup Express',
      farmerName: 'Aniket Deshmukh',
      location: 'Pune District',
      vehicleType: 'E-Pickup Express',
      capacity: '1,500 kg',
      crop: 'Green Leafy Vegetables',
      tempControl: 'Quick-Dispatch Insulated Deck',
      impact: 'Zero Emissions & 40% Lower Fuel Cost',
      image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800',
      badge: 'Eco Smart Logistics',
      badgeColor: 'bg-teal-600 text-white'
    }
  ];

  const quickFeatures = [
    {
      id: 'forecasting',
      title: 'AI Price Forecasting',
      desc: 'Predict crop prices up to 30 days in advance using XGBoost AI models trained on Agmarknet data.',
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-700',
      badge: '94% Accuracy'
    },
    {
      id: 'mandi-comparison',
      title: 'Multi-Mandi Net Profit',
      desc: 'Compare rates across 10+ APMC mandis with real transport costs deducted to find true net profit.',
      icon: Store,
      color: 'from-blue-600 to-indigo-800',
      badge: 'Real-time APMC'
    },
    {
      id: 'profitability',
      title: 'Sell vs Hold Advisor',
      desc: 'Determine whether holding your harvest in cold storage pays off after accounting for spoilage & storage fees.',
      icon: Calculator,
      color: 'from-amber-500 to-orange-700',
      badge: 'Profit Maximizer'
    },
    {
      id: 'logistics',
      title: 'VRP Vehicle Routing',
      desc: 'Book temperature-controlled trucks with dynamic rerouting around traffic jams and highway delays.',
      icon: Truck,
      color: 'from-forest-700 to-forest-900',
      badge: 'GPS & Telematics'
    },
    {
      id: 'demand-analysis',
      title: 'Regional Demand Radar',
      desc: 'Spot upcoming demand spikes in urban consumption centers before sending your truck.',
      icon: BarChart3,
      color: 'from-purple-600 to-indigo-900',
      badge: 'Market Radar'
    },
    {
      id: 'price-alerts',
      title: 'Instant SMS & Price Alerts',
      desc: 'Set custom price triggers and receive automated WhatsApp & SMS alerts when mandi prices peak.',
      icon: Bell,
      color: 'from-rose-500 to-red-700',
      badge: 'Instant Alert'
    }
  ];

  return (
    <div className="space-y-12 pb-10">
      {/* HERO SECTION */}
      <section className="bg-white border border-forest-100 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        {/* Background glow graphics */}
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-80 h-80 bg-forest-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 rounded-full bg-forest-50 border border-forest-200 px-4 py-1.5 shadow-xs text-xs font-bold text-forest-700">
              <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
              <span>Agmarknet AI Price & Market Intelligence Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-forest-900 tracking-tight leading-[1.15]">
              Predict Crop Prices & Maximize Your Farmer Income
            </h1>

            <p className="text-base text-slate-600 font-medium leading-relaxed max-w-2xl">
              Eliminate market price uncertainty. KrishiFlow combines AI price forecasting, multi-mandi net profit comparison, demand analysis, and VRP refrigerated logistics to help farmers sell at peak prices.
            </p>

            {/* Action Buttons mapped to Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                onClick={() => setActiveTab('forecasting')}
                className="btn-forest-primary px-6 py-3.5 text-sm flex items-center gap-2 group shadow-md"
              >
                <TrendingUp className="h-4 w-4" />
                <span>View AI Price Forecast</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab('mandi-comparison')}
                className="btn-forest-secondary px-6 py-3.5 text-sm flex items-center gap-2"
              >
                <Store className="h-4 w-4 text-forest-700" />
                <span>Compare Mandi Prices</span>
              </button>

              <button
                onClick={() => setActiveTab('profitability')}
                className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Calculator className="h-4 w-4" />
                <span>Sell vs Hold Advisor</span>
              </button>
            </div>

            {/* Key Impact Stats Bar */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 max-w-lg">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-forest-800 tracking-tight">+22%</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">Average Income Boost</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-forest-800 tracking-tight">94%</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">AI Model Accuracy</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-forest-800 tracking-tight">10+ APMCs</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">Live Mandis Monitored</div>
              </div>
            </div>
          </div>

          {/* Right Interactive Live AI Market Snapshot Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full krushi-card p-6 bg-gradient-to-br from-forest-900 via-forest-800 to-emerald-950 text-white rounded-3xl shadow-2xl space-y-4 border border-forest-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-forest-700/80 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-extrabold text-emerald-400">Live AI Market Snapshot</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">Active</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex justify-between items-center backdrop-blur-xs">
                  <div>
                    <div className="text-xs text-slate-300 font-medium">Commodity</div>
                    <div className="text-lg font-black text-white">{cropDetails.cropType || 'Tomato'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-300 font-medium">Nashik Current Rate</div>
                    <div className="text-lg font-black text-emerald-400">₹38 / kg</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex justify-between items-center backdrop-blur-xs">
                  <div>
                    <div className="text-xs text-slate-300 font-medium">Recommended Mandi</div>
                    <div className="text-sm font-extrabold text-white">Vashi Wholesale APMC</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-300 font-medium">Vashi Rate</div>
                    <div className="text-lg font-black text-amber-300">₹48 / kg</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex justify-between items-center shadow-inner">
                  <div>
                    <div className="text-xs text-emerald-200 font-bold">Optimal Strategy</div>
                    <div className="text-xs text-white font-extrabold flex items-center gap-1 mt-0.5">
                      <span>Hold for 4 Days</span>
                      <ArrowRight className="h-3 w-3 text-emerald-400" />
                      <span>Send to Vashi</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-200 font-bold">Net Profit Delta</div>
                    <div className="text-base font-black text-emerald-300">+₹25,000</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveTab('forecasting')}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all text-center block tracking-wide uppercase active:scale-98"
              >
                Explore Full Market Insights
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* FARMERS & LOGISTICS FLEET SHOWCASE (Dedicated to Home Page) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-forest-200/80 pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-forest-700 uppercase tracking-wider mb-1">
              <Truck className="h-4 w-4 text-emerald-600" />
              <span>Smart Agricultural Logistics</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-forest-900 tracking-tight">
              Farmers Powered by Cold-Chain Fleet & VRP Optimization
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-3xl mt-1">
              KrishiFlow links local farmers directly with temperature-controlled vehicles to dispatch produce to high-rate mandis before spoil dates.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('logistics')}
            className="btn-forest-primary px-4 py-2.5 text-xs flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-md"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Open Logistics VRP Map</span>
          </button>
        </div>

        {/* Fleet & Farmer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {fleetShowcase.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-3xl border border-forest-100 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col group"
            >
              {/* Image Container */}
              <div className="relative h-48 overflow-hidden bg-slate-900">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Badge top-left */}
                <div className="absolute top-3 left-3">
                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>

                {/* Temp / Specs Pill top-right */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-emerald-400" />
                  <span>{item.tempControl}</span>
                </div>

                {/* Farmer Info overlay bottom */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{item.location}</span>
                  </div>
                  <div className="text-lg font-black tracking-tight leading-tight">{item.farmerName}</div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-forest-800">{item.vehicleType}</span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Cap: {item.capacity}</span>
                  </div>

                  <div className="text-xs text-slate-600 font-semibold">
                    Cargo: <strong className="text-slate-900">{item.crop}</strong>
                  </div>

                  <div className="p-3 bg-forest-50/80 border border-forest-100 rounded-xl flex items-center space-x-2 text-xs text-forest-900 font-bold">
                    <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{item.impact}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold">GPS Active & Verified</span>
                  <button 
                    onClick={() => setActiveTab('logistics')}
                    className="text-xs font-extrabold text-forest-700 hover:text-forest-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Track Vehicle</span>
                    <ArrowRight className="h-3.5 w-3.5 text-forest-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORM MODULE QUICK LAUNCH GRID */}
      <section className="space-y-6">
        <div className="border-b border-forest-200/80 pb-4">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-forest-700 uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Integrated AI Tools</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-forest-900 tracking-tight">
            Comprehensive Market Intelligence Suite
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl mt-1">
            Select an AI module below to dive deep into price predictions, mandi comparisons, or sell timing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={() => setActiveTab(feat.id)}
                className="bg-white rounded-3xl border border-forest-100 p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${feat.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-extrabold bg-forest-50 text-forest-700 border border-forest-200 px-2.5 py-1 rounded-full">
                      {feat.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-forest-900 group-hover:text-emerald-700 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1.5">
                      {feat.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-forest-700">
                  <span>Open Tool</span>
                  <div className="h-7 w-7 rounded-full bg-forest-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* WHY FARMERS TRUST KRISHIFLOW BANNER */}
      <section className="bg-gradient-to-r from-forest-900 via-forest-800 to-forest-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-2 md:col-span-2">
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Guaranteed Market Uplift</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">Empowering Farmers with Agmarknet Big Data & AI</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
              By combining official government mandi rate streams with machine learning and temperature-controlled logistics, KrishiFlow ensures you get the highest net profit for every harvest.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-center">
            <button
              onClick={() => setActiveTab('forecasting')}
              className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all text-center flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Start Price Forecasting</span>
            </button>
            
            <button
              onClick={() => setActiveTab('logistics')}
              className="py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition-all text-center flex items-center justify-center gap-2"
            >
              <Truck className="h-4 w-4" />
              <span>Explore Fleet Logistics</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
