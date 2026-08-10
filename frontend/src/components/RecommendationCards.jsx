import React from 'react';
import { Trophy, TrendingUp, Truck, ShieldAlert, CheckCircle, Navigation, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const RecommendationCards = () => {
  const { recommendations, selectedRecommendation, setSelectedRecommendation, aiEngineSource } = useAppStore();

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="krushi-card p-8 text-center border border-forest-100 bg-white rounded-3xl">
        <Trophy className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <h3 className="text-base font-bold text-slate-700">No Active Market Recommendations</h3>
        <p className="text-xs text-slate-500 mt-1">Submit your crop details in the wizard to run real-time VRP route recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-extrabold text-forest-900 tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            AI Optimized Market Recommendations
          </h3>
          <p className="text-xs text-slate-500 font-medium">Ranked by Maximum Net Profit & Minimum Spoilage Risk</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-forest-50 border border-forest-200 px-3.5 py-1 text-xs font-bold text-forest-700">
          Source: {aiEngineSource || 'Google OR-Tools VRP'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {recommendations.map((rec, idx) => {
          const isSelected = selectedRecommendation?.marketId === rec.marketId;
          const isTop = idx === 0;

          return (
            <div
              key={rec.marketId || idx}
              onClick={() => setSelectedRecommendation(rec)}
              className={`krushi-card krushi-card-hover relative cursor-pointer p-5 border transition-all rounded-3xl ${
                isSelected
                  ? 'border-forest-700 bg-emerald-50/20 ring-2 ring-forest-700/20 shadow-xl'
                  : 'border-forest-100/80 bg-white hover:border-forest-300'
              }`}
            >
              {/* Medal Badge Header */}
              {rec.badge && (
                <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide border ${
                  isTop
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm'
                    : idx === 1
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-orange-100 text-orange-800 border-orange-200'
                }`}>
                  <Trophy className={`h-3.5 w-3.5 ${isTop ? 'text-amber-600' : 'text-slate-500'}`} />
                  {rec.badge}
                </div>
              )}

              {/* Market Title & City */}
              <div className="mb-3">
                <h4 className="text-base font-extrabold text-slate-900 group-hover:text-forest-700 transition-colors">{rec.marketName}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                  <span>{rec.marketCity}</span>
                  <span>•</span>
                  <span>{rec.routeDistanceKm} km ({rec.travelTimeHours} hrs)</span>
                </div>
              </div>

              {/* Highlighted Expected Profit */}
              <div className="mb-4 rounded-2xl bg-forest-50 p-3.5 border border-forest-100">
                <div className="text-[11px] font-bold text-forest-700 uppercase tracking-wider">Expected Net Profit</div>
                <div className="text-2xl font-extrabold text-forest-900 tracking-tight mt-0.5">
                  ₹{rec.netProfit.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Detailed Metrics Breakdown */}
              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-500">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Agmarknet Price:
                  </span>
                  <span className="font-bold text-slate-900">₹{rec.predictedPricePerKg}/kg</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-500">
                    <Truck className="h-3.5 w-3.5 text-amber-600" /> Transport Cost:
                  </span>
                  <span className="font-bold text-slate-900">₹{rec.transportCost.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-500">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600" /> Spoilage Risk:
                  </span>
                  <span className={`font-bold ${rec.spoilageRiskPercent > 10 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {rec.spoilageRiskPercent}% (₹{rec.spoilageLoss?.toLocaleString('en-IN')})
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                className={`mt-4 w-full py-2.5 px-3 rounded-full text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-forest-700 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-forest-50 text-slate-700 hover:text-forest-800'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" /> Selected & Tracked
                  </>
                ) : (
                  <>
                    <Navigation className="h-3.5 w-3.5" /> View Route Polyline <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
