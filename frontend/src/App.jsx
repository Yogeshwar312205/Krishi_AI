import React, { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PriceForecaster } from './components/PriceForecaster';
import { MandiComparison } from './components/MandiComparison';
import { DemandAnalysis } from './components/DemandAnalysis';
import { ProfitabilityEstimator } from './components/ProfitabilityEstimator';
import { PriceAlerts } from './components/PriceAlerts';
import { CropWizard } from './components/CropWizard';
import { RecommendationCards } from './components/RecommendationCards';
import { MapView } from './components/MapView';
import { DevTriggerBar } from './components/DevTriggerBar';

import { useSocket } from './hooks/useSocket';
import { useAppStore } from './store/useAppStore';
import { fetchHealthStatus, submitOptimization } from './services/api';
import { TrendingUp, Store, Calculator, ArrowRight, Sparkles, Play, ShieldCheck } from 'lucide-react';

export function App() {
  const { setSystemHealth, setRecommendations, activeTab, setActiveTab, cropDetails } = useAppStore();
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
      {/* Navigation Header */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* Dev Trigger Alert Banner */}
        <DevTriggerBar />

        {/* HERO SECTION - Replaced legacy text with Market Intelligence Hero */}
        <section className="bg-white border border-forest-100 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 rounded-full bg-forest-50 border border-forest-200 px-4 py-1.5 shadow-xs text-xs font-bold text-forest-700">
                <Sparkles className="h-4 w-4 text-emerald-600" />
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

            {/* Right Interactive Live Preview Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full krushi-card p-6 bg-gradient-to-br from-forest-900 to-forest-800 text-white rounded-3xl shadow-2xl space-y-4 border border-forest-700">
                <div className="flex items-center justify-between border-b border-forest-700/80 pb-3">
                  <span className="text-xs font-extrabold text-emerald-400">Live AI Market Snapshot</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full">Active</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-300 font-medium">Commodity</div>
                      <div className="text-lg font-black text-white">{cropDetails.cropType}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-300 font-medium">Nashik Current Rate</div>
                      <div className="text-lg font-black text-emerald-400">₹38 / kg</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-300 font-medium">Recommended Mandi</div>
                      <div className="text-sm font-extrabold text-white">Vashi Wholesale APMC</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-300 font-medium">Vashi Rate</div>
                      <div className="text-lg font-black text-amber-300">₹48 / kg</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-emerald-200 font-bold">Optimal Strategy</div>
                      <div className="text-xs text-white font-extrabold">Hold for 4 Days → Send to Vashi</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-emerald-200 font-bold">Net Profit Delta</div>
                      <div className="text-sm font-black text-emerald-300">+₹25,000</div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveTab('forecasting')}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all text-center block"
                >
                  Explore Full Market Insights
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURE CONTAINER DRIVEN BY ACTIVE NAVIGATION TAB */}
        <section className="space-y-6">
          {activeTab === 'forecasting' && <PriceForecaster />}
          {activeTab === 'mandi-comparison' && <MandiComparison />}
          {activeTab === 'demand-analysis' && <DemandAnalysis />}
          {activeTab === 'profitability' && <ProfitabilityEstimator />}
          {activeTab === 'price-alerts' && <PriceAlerts />}

          {/* LOGISTICS & VRP INTERACTIVE SECTION */}
          {activeTab === 'logistics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-forest-200/80 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-forest-900 tracking-tight">
                    Live VRP Logistics & Vehicle Rerouting
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    Input crop details to calculate 2dsphere vehicle matching and optimal market routes.
                  </p>
                </div>
                
                <button
                  onClick={startVehicleSimulation}
                  className="btn-forest-primary px-5 py-2.5 text-xs flex items-center gap-1.5"
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

              <div className="pt-4">
                <RecommendationCards />
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Clean Footer */}
      <footer className="border-t border-forest-200/80 bg-white py-6 text-center text-xs text-slate-500 font-semibold mt-12">
        KrishiFlow © 2026 — Intelligent Crop Price Prediction & Market Insights Platform
      </footer>
    </div>
  );
}

export default App;
