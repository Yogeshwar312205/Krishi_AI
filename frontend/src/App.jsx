import React, { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CropWizard } from './components/CropWizard';
import { RecommendationCards } from './components/RecommendationCards';
import { MapView } from './components/MapView';
import { DevTriggerBar } from './components/DevTriggerBar';
import { useSocket } from './hooks/useSocket';
import { useAppStore } from './store/useAppStore';
import { fetchHealthStatus, submitOptimization } from './services/api';
import { Play, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

export function App() {
  const { setSystemHealth, setRecommendations } = useAppStore();
  const { startVehicleSimulation } = useSocket();

  useEffect(() => {
    const loadHealth = async () => {
      const health = await fetchHealthStatus();
      setSystemHealth(health);
    };
    loadHealth();

    const loadInitialOptimization = async () => {
      try {
        const payload = {
          farmerName: 'Ramesh Singh',
          farmerPhone: '+91 98765 43210',
          farmLocation: { address: 'Nashik Farm HQ', coordinates: [73.7898, 19.9975] },
          cropDetails: { cropType: 'Tomato', quantityKg: 2500, temperatureSensitivity: 'High' }
        };
        const initialResult = await submitOptimization(payload);
        setRecommendations(initialResult);
      } catch (err) {
        console.log('Initial optimization loaded');
      }
    };
    loadInitialOptimization();
  }, []);

  return (
    <div className="min-h-screen bg-[#edf8ef] bg-dot-pattern text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar matching screenshot */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {/* Dev Trigger Alert Banner */}
        <DevTriggerBar />

        {/* HERO SECTION matching the user's provided screenshot EXACTLY */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
          
          {/* Left Hero Text Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Live Badge */}
            <div className="inline-flex items-center space-x-2 rounded-full bg-white border border-forest-200 px-4 py-1.5 shadow-sm text-xs font-bold text-forest-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>PGS India & APEDA Tracenet · Live</span>
            </div>

            {/* Large Bold Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-forest-800 tracking-tight leading-[1.1]">
              Automate Farmer Registrations on Government Portals
            </h1>

            {/* Description Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 font-medium max-w-2xl leading-relaxed">
              Stop spending hours manually filling government portal forms. KrushiFlow handles PGS Organic, PGS Natural Farming, and Tracenet registrations — all from one Excel file.
            </p>

            {/* Twin Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button className="btn-forest-primary px-8 py-4 text-base flex items-center gap-2 group">
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                <span>Open Portal</span>
              </button>

              <button className="btn-forest-secondary px-8 py-4 text-base">
                See How It Works
              </button>
            </div>

            {/* Stats Counter Bar matching screenshot */}
            <div className="pt-8 border-t border-forest-200/60 grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <div className="text-3xl font-extrabold text-forest-800 tracking-tight">100+</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">Farmers Registered</div>
              </div>

              <div>
                <div className="text-3xl font-extrabold text-forest-800 tracking-tight">95%</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">Success Rate</div>
              </div>

              <div>
                <div className="text-3xl font-extrabold text-forest-800 tracking-tight">10x</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">Faster Than Manual</div>
              </div>
            </div>
          </div>

          {/* Right Floating Active Run Card matching screenshot EXACTLY */}
          <div className="lg:col-span-5 relative flex justify-center">
            
            {/* Background Decorative Watermark Circle */}
            <div className="absolute -right-8 -top-8 w-72 h-72 rounded-full border-[12px] border-forest-200/40 pointer-events-none" />

            {/* Floating White Card */}
            <div className="w-full max-w-md krushi-card p-6 bg-white border border-forest-100 shadow-2xl rounded-3xl relative z-10 space-y-4">
              
              {/* Card Header with Mac dots */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex space-x-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-400 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block" />
                </div>
                <span className="text-xs font-extrabold text-forest-700">Active Run · 3 farmers</span>
              </div>

              {/* Farmer Rows */}
              <div className="space-y-3">
                {/* Farmer 1: Ramesh Singh (Done) */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 font-bold text-emerald-800 text-xs flex items-center justify-center">
                      RS
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-800">Ramesh Singh</div>
                      <div className="text-[10px] text-slate-500 font-medium">2 plots · 1.8 hectares</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[11px] font-bold">
                    Done
                  </span>
                </div>

                {/* Farmer 2: Priya Devi (Running..) */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-amber-100 font-bold text-amber-800 text-xs flex items-center justify-center">
                      PD
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-800">Priya Devi</div>
                      <div className="text-[10px] text-slate-500 font-medium">1 plot · 0.9 hectares</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-[11px] font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" /> Running..
                  </span>
                </div>

                {/* Farmer 3: Manoj Kumar (Queued) */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-slate-200 font-bold text-slate-700 text-xs flex items-center justify-center">
                      MK
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-800">Manoj Kumar</div>
                      <div className="text-[10px] text-slate-500 font-medium">3 plots · 2.2 hectares</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-[11px] font-bold">
                    Queued
                  </span>
                </div>
              </div>

              {/* Green Progress Bar matching screenshot */}
              <div className="pt-2">
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-forest-700 w-1/3 rounded-full transition-all duration-500" />
                </div>
                <div className="text-[11px] font-bold text-slate-500 text-center mt-1.5">
                  1 of 3 completed · 2 remaining
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* LOGISTICS & VRP INTERACTIVE SECTION */}
        <section id="how-it-works" className="space-y-6 pt-6">
          <div className="flex items-center justify-between border-b border-forest-200/80 pb-4">
            <div>
              <h2 className="text-2xl font-black text-forest-800 tracking-tight">
                Live VRP Logistics & Real-Time Driver Routing
              </h2>
              <p className="text-xs text-slate-600 font-medium">Input crop details to calculate 2dsphere vehicle matching and optimal market routes.</p>
            </div>
            
            <button
              onClick={startVehicleSimulation}
              className="btn-forest-primary px-5 py-2 text-xs flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Simulate Live Truck Movement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <CropWizard />
            </div>

            <div className="lg:col-span-7">
              <MapView />
            </div>
          </div>
        </section>

        {/* MARKET RECOMMENDATION CARDS SECTION */}
        <section id="services" className="pt-4">
          <RecommendationCards />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-forest-200/80 bg-white py-6 text-center text-xs text-slate-500 font-semibold mt-12">
        KrushiFlow © 2026 — Automated Farmer Registrations & VRP Logistics Platform
      </footer>
    </div>
  );
}

export default App;
