import React, { useState } from 'react';
import { MapPin, Package, Calendar, Thermometer, Sparkles, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { submitOptimization } from '../services/api';

const FARM_PRESETS = [
  { name: 'Nashik Central Farm', coords: [73.7898, 19.9975], region: 'Nashik, MH' },
  { name: 'Pune Valley Orchard', coords: [73.8567, 18.5204], region: 'Pune, MH' },
  { name: 'Sangli Agro Region', coords: [74.5688, 16.8524], region: 'Sangli, MH' },
  { name: 'Surat Border Farm', coords: [72.8311, 21.1702], region: 'Surat, GJ' },
];

export const CropWizard = () => {
  const { user, cropDetails, setCropDetails, farmerOrigin, farmerAddress, setFarmerOrigin, setRecommendations } = useAppStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePresetSelect = (preset) => {
    setFarmerOrigin(preset.coords, preset.name);
  };

  const handleOptimizeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        // Attribute the request to the signed-in farmer.
        farmerName: user?.name || 'Guest Farmer',
        farmerPhone: user?.phone || '',
        farmLocation: {
          address: farmerAddress,
          coordinates: farmerOrigin
        },
        cropDetails: cropDetails
      };

      const result = await submitOptimization(payload);
      setRecommendations(result);
      setStep(3);
    } catch (err) {
      // Surface the failure instead of leaving the wizard silently stuck on step 2.
      setErrorMsg(err.message || 'Could not reach the routing engine. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="krushi-card p-6 border border-forest-100/80 shadow-xl bg-white rounded-3xl">
      {/* Wizard Header Progress */}
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-xs font-bold text-forest-700 border border-forest-200 mb-1">
            <span className="h-2 w-2 rounded-full bg-forest-700 animate-pulse" />
            Live VRP Logistics Engine
          </div>
          <h2 className="text-xl font-extrabold text-forest-800 tracking-tight">
            Crop Dispatch Wizard
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Step {step} of 3: {step === 1 ? 'Farm Origin & Crop Selection' : step === 2 ? 'Urgency & Storage' : 'VRP Optimization Generated'}</p>
        </div>
        
        <div className="flex items-center space-x-1.5">
          <span className={`h-2.5 w-6 rounded-full transition-all ${step >= 1 ? 'bg-forest-700' : 'bg-slate-200'}`} />
          <span className={`h-2.5 w-6 rounded-full transition-all ${step >= 2 ? 'bg-forest-700' : 'bg-slate-200'}`} />
          <span className={`h-2.5 w-6 rounded-full transition-all ${step >= 3 ? 'bg-forest-700' : 'bg-slate-200'}`} />
        </div>
      </div>

      <form onSubmit={handleOptimizeSubmit} className="space-y-5">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Farm Origin Picker */}
            <div>
              <label className="block text-xs font-bold text-forest-900 mb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-forest-700" /> Select Farm Origin Location
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {FARM_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-3 text-left rounded-2xl border text-xs transition-all ${
                      farmerOrigin[0] === preset.coords[0] && farmerOrigin[1] === preset.coords[1]
                        ? 'border-forest-700 bg-forest-50 text-forest-800 font-bold shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-forest-300'
                    }`}
                  >
                    <div className="font-extrabold text-slate-800">{preset.name}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{preset.region}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Crop Type & Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest-900 mb-1.5 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-forest-700" /> Crop Type
                </label>
                <select
                  value={cropDetails.cropType}
                  onChange={(e) => setCropDetails({ cropType: e.target.value })}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-forest-700 focus:bg-white focus:outline-none"
                >
                  <option value="Tomato">Fresh Tomatoes</option>
                  <option value="Potato">Potatoes</option>
                  <option value="Onion">Nashik Onions</option>
                  <option value="Mango">Alphonso Mangoes</option>
                  <option value="Banana">Bananas</option>
                  <option value="Rice">Basmati Rice</option>
                  <option value="Wheat">Sharbati Wheat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest-900 mb-1.5">Quantity (Kg)</label>
                <input
                  type="number"
                  value={cropDetails.quantityKg}
                  onChange={(e) => setCropDetails({ quantityKg: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-forest-700 focus:bg-white focus:outline-none"
                  min="100"
                  max="20000"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-forest-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              <span>Continue to Storage & Sensitivity</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Harvest Time & Perishability Sensitivity */}
            <div>
              <label className="block text-xs font-bold text-forest-900 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-forest-700" /> Harvest Date / Dispatch Urgency
              </label>
              <input
                type="date"
                value={cropDetails.harvestTime}
                onChange={(e) => setCropDetails({ harvestTime: e.target.value })}
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-forest-700 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-900 mb-2 flex items-center gap-1.5">
                <Thermometer className="h-4 w-4 text-forest-700" /> Temperature Sensitivity Risk
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['High', 'Medium', 'Low'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setCropDetails({ temperatureSensitivity: level })}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                      cropDetails.temperatureSensitivity === level
                        ? 'border-forest-700 bg-forest-50 text-forest-800 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {level} Risk
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-forest-secondary w-1/3 py-2.5 text-sm"
              >
                ← Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn-forest-primary w-2/3 py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Calculating VRP Routes...
                  </span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Run AI Optimization
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center py-4 animate-in fade-in duration-300">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center border border-forest-300 shadow-inner">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-forest-900">VRP Route Optimization Complete!</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Google OR-Tools analyzed available APMC mandis and 2dsphere trucks.</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-forest-secondary px-5 py-2 text-xs font-bold"
            >
              Modify Crop Inputs
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
