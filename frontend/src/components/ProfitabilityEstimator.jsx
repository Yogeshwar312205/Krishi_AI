import React, { useState } from 'react';
import { Calculator, ArrowRight, ShieldCheck, AlertTriangle, TrendingUp, DollarSign, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ProfitabilityEstimator = () => {
  const { cropDetails, setCropDetails } = useAppStore();
  const [holdDays, setHoldDays] = useState(4);
  const [useColdStorage, setUseColdStorage] = useState(true);

  // Crop parameters
  const currentPricePerKg = cropDetails.cropType === 'Tomato' ? 38 : (cropDetails.cropType === 'Mango' ? 85 : 28);
  const predictedFuturePricePerKg = Math.round((currentPricePerKg * (1 + 0.05 * holdDays)) * 10) / 10;

  const totalQtyKg = cropDetails.quantityKg || 2500;
  
  // Storage Cost calculations
  const storageCostPerKgPerDay = useColdStorage ? 0.30 : 0.05; // ₹0.30/kg/day for refrigerated cold storage
  const totalStorageCost = Math.round(totalQtyKg * storageCostPerKgPerDay * holdDays);

  // Spoilage calculation
  const spoilageRatePerDay = useColdStorage ? 0.005 : 0.03; // 0.5% per day in cold storage vs 3% per day ambient
  const totalSpoilagePercent = Math.min(30, Math.round(spoilageRatePerDay * holdDays * 100 * 10) / 10);
  const usableQtyAfterHold = Math.round(totalQtyKg * (1 - totalSpoilagePercent / 100));
  const spoilageLossValue = Math.round((totalQtyKg - usableQtyAfterHold) * predictedFuturePricePerKg);

  // Financial outcomes
  const sellTodayRevenue = Math.round(totalQtyKg * currentPricePerKg);
  const holdFutureGrossRevenue = Math.round(usableQtyAfterHold * predictedFuturePricePerKg);
  const holdFutureNetProfit = holdFutureGrossRevenue - totalStorageCost;
  const profitDelta = holdFutureNetProfit - sellTodayRevenue;

  const isHoldProfitable = profitDelta > 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300">
            <Calculator className="h-3.5 w-3.5 text-emerald-300" />
            <span>Financial Tradeoff & Spoilage Math Model</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Sell Today vs. Hold Calculator
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            Calculate exact net earnings by factoring in storage costs, crop perishability decay rates, and AI price forecasts before deciding to sell or hold.
          </p>
        </div>

        {/* Big Profit Delta Badge */}
        <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg min-w-[240px] flex items-center space-x-3 ${
          isHoldProfitable 
            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' 
            : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
        }`}>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-xl ${
            isHoldProfitable ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            {isHoldProfitable ? '+$' : '-$'}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Estimated Profit Gain</div>
            <div className="text-2xl font-black tracking-tight">
              {profitDelta >= 0 ? `+₹${profitDelta.toLocaleString('en-IN')}` : `-₹${Math.abs(profitDelta).toLocaleString('en-IN')}`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Form & Calculation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Input Parameters Panel */}
        <div className="lg:col-span-5 bg-white border border-forest-100 rounded-3xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-extrabold text-forest-900 border-b border-slate-100 pb-3">
            Harvest & Holding Parameters
          </h3>

          <div className="space-y-4">
            {/* Commodity Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Crop Commodity</label>
              <select
                value={cropDetails.cropType}
                onChange={(e) => setCropDetails({ cropType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-forest-900 rounded-xl px-3.5 py-2 font-bold text-sm outline-none focus:border-forest-500"
              >
                {['Tomato', 'Potato', 'Onion', 'Wheat', 'Rice', 'Mango', 'Banana'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Harvest Quantity (kg)</label>
              <input
                type="number"
                value={totalQtyKg}
                onChange={(e) => setCropDetails({ quantityKg: Number(e.target.value) || 1000 })}
                className="w-full bg-slate-50 border border-slate-200 text-forest-900 rounded-xl px-3.5 py-2 font-bold text-sm outline-none focus:border-forest-500"
              />
            </div>

            {/* Storage Duration Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">Hold Duration:</span>
                <span className="text-emerald-700 font-extrabold">{holdDays} Days</span>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                value={holdDays}
                onChange={(e) => setHoldDays(Number(e.target.value))}
                className="w-full accent-forest-700 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>1 Day (Quick)</span>
                <span>7 Days</span>
                <span>14 Days (Extended)</span>
              </div>
            </div>

            {/* Storage Type Switcher */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-extrabold text-slate-700">Storage Facility</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUseColdStorage(true)}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                    useColdStorage 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-300' 
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-extrabold">Refrigerated Cold Storage</div>
                  <div className="text-[10px] text-slate-500 font-medium">₹0.30/kg/day · 0.5% spoilage/day</div>
                </button>

                <button
                  type="button"
                  onClick={() => setUseColdStorage(false)}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                    !useColdStorage 
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-300' 
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-extrabold">Ambient On-Farm Storage</div>
                  <div className="text-[10px] text-slate-500 font-medium">₹0.05/kg/day · 3.0% spoilage/day</div>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right: Comparative Decision Matrix Output */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Option A: Sell Today */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Option A</span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full">Immediate Cash</span>
              </div>

              <h4 className="text-lg font-black text-slate-800">Sell Today</h4>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Current Market Rate</div>
                <div className="text-2xl font-black text-slate-900">₹{currentPricePerKg} / kg</div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Quantity:</span>
                  <span className="font-bold text-slate-800">{totalQtyKg.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Storage Expenses:</span>
                  <span className="font-bold text-slate-800">₹0</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Spoilage Loss:</span>
                  <span className="font-bold text-slate-800">0 kg (0%)</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-slate-900">
                  <span>Net Payout:</span>
                  <span className="text-lg text-slate-900">₹{sellTodayRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Option B: Hold for N Days */}
            <div className={`bg-white border rounded-3xl p-6 shadow-xl space-y-4 relative ${
              isHoldProfitable 
                ? 'border-emerald-400 ring-2 ring-emerald-400/50 bg-gradient-to-b from-emerald-50/50 to-white' 
                : 'border-rose-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Option B</span>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">Recommended</span>
              </div>

              <h4 className="text-lg font-black text-forest-900">Hold for {holdDays} Days</h4>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-1">
                <div className="text-xs text-emerald-800 font-medium">Predicted Future Rate</div>
                <div className="text-2xl font-black text-emerald-900">₹{predictedFuturePricePerKg} / kg</div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Usable Qty after spoilage:</span>
                  <span className="font-bold text-slate-800">{usableQtyAfterHold.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Storage Cost ({holdDays} days):</span>
                  <span className="font-bold text-rose-600">-₹{totalStorageCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Spoilage Loss ({totalSpoilagePercent}%):</span>
                  <span className="font-bold text-amber-600">-₹{spoilageLossValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black">
                  <span className="text-forest-900">Net Take-Home:</span>
                  <span className="text-lg text-emerald-700">₹{holdFutureNetProfit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>

          {/* AI Decision Verdict Banner */}
          <div className={`p-5 rounded-3xl border shadow-lg space-y-2 ${
            isHoldProfitable 
              ? 'bg-emerald-800 text-white border-emerald-700' 
              : 'bg-amber-800 text-white border-amber-700'
          }`}>
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-200 uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>AI Decision Verdict</span>
            </div>
            <div className="text-xl font-black">
              {isHoldProfitable 
                ? `Hold crop for ${holdDays} days in ${useColdStorage ? 'Cold Storage' : 'Ambient Storage'} for +₹${profitDelta.toLocaleString('en-IN')} extra profit!`
                : `Sell today immediately! Storage costs and perishability decay outpace future price gains by ₹${Math.abs(profitDelta).toLocaleString('en-IN')}.`
              }
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
