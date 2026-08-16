import React, { useEffect, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { PriceForecaster } from './components/PriceForecaster';
import { MandiComparison } from './components/MandiComparison';
import { DemandAnalysis } from './components/DemandAnalysis';
import { ProfitabilityEstimator } from './components/ProfitabilityEstimator';
import { PriceAlerts } from './components/PriceAlerts';
import { AuthPage } from './components/AuthPage';
import { MyBookings } from './components/MyBookings';
import { CropWizard } from './components/CropWizard';
import { RecommendationCards } from './components/RecommendationCards';
import { DevTriggerBar } from './components/DevTriggerBar';
import { DateVehicleBooking } from './components/DateVehicleBooking';
import { DriverDashboard } from './components/DriverDashboard';
import { BuyerDashboard } from './components/BuyerDashboard';

// Lazy-loaded: both pull in heavy dependencies (Leaflet, socket audio) that
// most sessions never touch (only the logistics tab / voice assistant).
const MapView = lazy(() => import('./components/MapView').then((m) => ({ default: m.MapView })));
const KisanVoiceBot = lazy(() => import('./components/KisanVoiceBot').then((m) => ({ default: m.KisanVoiceBot })));

import { useSocket } from './hooks/useSocket';
import { useAppStore } from './store/useAppStore';
import { fetchHealthStatus, submitOptimization } from './services/api';
import { Play } from 'lucide-react';

export function App() {
  const { setSystemHealth, setRecommendations, activeTab } = useAppStore();
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

        {/* FEATURE CONTAINER DRIVEN BY ACTIVE NAVIGATION TAB */}
        <section className="space-y-6">
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'forecasting' && <PriceForecaster />}
          {activeTab === 'mandi-comparison' && <MandiComparison />}
          {activeTab === 'demand-analysis' && <DemandAnalysis />}
          {activeTab === 'profitability' && <ProfitabilityEstimator />}
          {activeTab === 'price-alerts' && <PriceAlerts />}
          {activeTab === 'bookings' && <MyBookings />}
          {activeTab === 'auth' && <AuthPage />}

          {/* UBER-LIKE DATE VEHICLE BOOKING FOR FARMERS */}
          {activeTab === 'book-truck' && <DateVehicleBooking />}

          {/* DRIVER SPECIFIC TABS */}
          {(activeTab === 'driver-jobs' || activeTab === 'driver-vehicles') && <DriverDashboard />}

          {/* BUYER SPECIFIC TABS */}
          {(activeTab === 'buyer-postings' || activeTab === 'inbound-shipments') && <BuyerDashboard />}

          {/* LOGISTICS & VRP INTERACTIVE SECTION */}
          {activeTab === 'logistics' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-forest-900 tracking-tight">
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
                <div className="furrow-divider" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5">
                  <CropWizard />
                </div>

                <div className="lg:col-span-7">
                  <Suspense fallback={<div className="krushi-card h-full min-h-[320px] animate-pulse" />}>
                    <MapView />
                  </Suspense>
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
        <span className="font-display italic font-medium text-forest-800/80">KrishiFlow</span>
        <span className="mx-1.5 text-terracotta-400">·</span>
        © 2026 — Intelligent Crop Price Prediction & Market Insights Platform
      </footer>
      {/* Floating Kisan Voice AI Assistant */}
      <Suspense fallback={null}>
        <KisanVoiceBot />
      </Suspense>
    </div>
  );
}

export default App;
