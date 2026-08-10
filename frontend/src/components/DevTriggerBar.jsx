import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const DevTriggerBar = () => {
  const { trafficAlert, clearTrafficAlert } = useAppStore();

  if (!trafficAlert) return null;

  const { message, recalculatedMetrics } = trafficAlert;

  return (
    <div className="rounded-3xl bg-amber-50/95 border border-amber-300 p-5 shadow-xl backdrop-blur-md animate-in slide-in-from-top duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3.5">
          <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-700 border border-amber-300">
            <AlertTriangle className="h-6 w-6 animate-bounce text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-extrabold text-amber-950">Real-Time VRP Traffic Reroute Triggered</h4>
              <span className="rounded-full bg-amber-200/70 border border-amber-400 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                Socket.io WebSocket Event
              </span>
            </div>
            <p className="text-xs text-amber-900 font-medium mt-0.5">{message}</p>

            {recalculatedMetrics && (
              <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="rounded-2xl bg-white p-2.5 border border-amber-200 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-medium">Detour Distance</div>
                  <div className="font-extrabold text-slate-800">{recalculatedMetrics.newDistanceKm} km</div>
                </div>
                <div className="rounded-2xl bg-white p-2.5 border border-amber-200 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-medium">Recalculated Time</div>
                  <div className="font-extrabold text-slate-800">{recalculatedMetrics.newTravelTimeHours} hrs</div>
                </div>
                <div className="rounded-2xl bg-white p-2.5 border border-amber-200 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-medium">Adjusted Spoilage Risk</div>
                  <div className="font-extrabold text-amber-700">{recalculatedMetrics.newSpoilageRiskPercent}%</div>
                </div>
                <div className="rounded-2xl bg-white p-2.5 border border-amber-200 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-medium">Updated Net Profit</div>
                  <div className="font-extrabold text-forest-700">₹{recalculatedMetrics.newNetProfit.toLocaleString('en-IN')}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={clearTrafficAlert}
          className="rounded-full p-1.5 text-slate-400 hover:bg-amber-200 hover:text-slate-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
