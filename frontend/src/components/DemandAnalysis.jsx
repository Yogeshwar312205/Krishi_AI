import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, AlertCircle, ArrowUpRight, ShieldCheck, Flame, PieChart, Wheat } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { CROP_OPTIONS } from '../utils/constants';
import { Select } from './ui/Select';

export const DemandAnalysis = () => {
  const { cropDetails, setCropDetails } = useAppStore();

  const demandMetrics = {
    Tomato: { demandLevel: 'HIGH DEMAND', index: 88, arrivalKg: '14,200 Quintals', deficitPercent: '+18%', buyerCount: 142, statusColor: 'bg-emerald-500', trendText: 'High demand driven by urban restaurant consumption' },
    Potato: { demandLevel: 'MODERATE DEMAND', index: 64, arrivalKg: '28,500 Quintals', deficitPercent: '-4%', buyerCount: 98, statusColor: 'bg-amber-500', trendText: 'Stable arrivals from cold storage releases' },
    Onion: { demandLevel: 'HIGH DEMAND', index: 92, arrivalKg: '19,800 Quintals', deficitPercent: '+24%', buyerCount: 185, statusColor: 'bg-rose-500', trendText: 'Export order surge creating supply deficit in Vashi' },
    Wheat: { demandLevel: 'STABLE DEMAND', index: 58, arrivalKg: '35,000 Quintals', deficitPercent: '0%', buyerCount: 75, statusColor: 'bg-emerald-600', trendText: 'Government procurement active at MSP' },
    Rice: { demandLevel: 'HIGH DEMAND', index: 81, arrivalKg: '22,100 Quintals', deficitPercent: '+12%', buyerCount: 110, statusColor: 'bg-emerald-500', trendText: 'Premium Basmati & Kolam experiencing strong retail demand' },
    Mango: { demandLevel: 'PEAK DEMAND', index: 96, arrivalKg: '8,400 Quintals', deficitPercent: '+32%', buyerCount: 220, statusColor: 'bg-emerald-500', trendText: 'Seasonal peak demand in metro markets' },
    Banana: { demandLevel: 'MODERATE DEMAND', index: 68, arrivalKg: '16,500 Quintals', deficitPercent: '+5%', buyerCount: 88, statusColor: 'bg-amber-500', trendText: 'Steady daily wholesale movement' }
  };

  const activeCropMetric = demandMetrics[cropDetails.cropType] || demandMetrics.Tomato;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300">
            <BarChart3 className="h-3.5 w-3.5 text-emerald-300" />
            <span>Agmarknet & Retail Consumption Trends</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Demand Analysis & Market Trends
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            Track real-time market arrival volumes, buyer density, and consumption deficits across top APMCs to identify high-margin selling opportunities.
          </p>
        </div>

        {/* Quick Crop Selector */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-center space-x-3 text-xs font-bold">
          <span>Select Commodity:</span>
          <Select
            icon={Wheat}
            tone="dark"
            value={cropDetails.cropType}
            onChange={(e) => setCropDetails({ cropType: e.target.value })}
            options={CROP_OPTIONS.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Demand Index Gauge */}
        <div className="bg-white border border-forest-100 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Demand Pressure</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-forest-900">{activeCropMetric.index}</span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              style={{ width: `${activeCropMetric.index}%` }} 
              className={`h-full ${activeCropMetric.statusColor} rounded-full transition-all duration-500`}
            />
          </div>
          <div className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
            {activeCropMetric.demandLevel}
          </div>
        </div>

        {/* Card 2: Market Deficit */}
        <div className="bg-white border border-forest-100 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Supply vs Buyer Deficit</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{activeCropMetric.deficitPercent}</div>
          <p className="text-xs text-slate-600 font-medium">Higher demand than available Mandi arrivals</p>
        </div>

        {/* Card 3: Arrival Volume */}
        <div className="bg-white border border-forest-100 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Daily Mandi Arrivals</span>
            <PieChart className="h-4 w-4 text-forest-600" />
          </div>
          <div className="text-2xl font-black text-forest-900">{activeCropMetric.arrivalKg}</div>
          <p className="text-xs text-slate-600 font-medium">Aggregated across Nashik & Vashi</p>
        </div>

        {/* Card 4: Active Wholesale Buyers */}
        <div className="bg-white border border-forest-100 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Active APMC Traders</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-900">{activeCropMetric.buyerCount}</div>
          <p className="text-xs text-slate-600 font-medium">Registered wholesale buyers bidding today</p>
        </div>

      </div>

      {/* Demand Heatmap & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Regional Demand Distribution */}
        <div className="lg:col-span-8 bg-white border border-forest-100 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-forest-900">Regional Buyer Demand Distribution</h3>
            <span className="text-xs text-emerald-700 font-bold">Vashi & Mumbai Metro = Peak Demand</span>
          </div>

          <div className="space-y-4">
            {/* Region 1: Mumbai Vashi APMC */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-800">Vashi Wholesale APMC (Mumbai)</span>
                <span className="text-emerald-700">High Demand (94%) · Deficit: +22%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[94%] rounded-full" />
              </div>
            </div>

            {/* Region 2: Pune Market */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-800">Gultekdi APMC Market (Pune)</span>
                <span className="text-emerald-700">Moderate-High (78%) · Deficit: +12%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-[78%] rounded-full" />
              </div>
            </div>

            {/* Region 3: Surat Hub */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-800">Surat Wholesale Hub</span>
                <span className="text-amber-700">Moderate (65%) · Deficit: +5%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 w-[65%] rounded-full" />
              </div>
            </div>

            {/* Region 4: Nashik Local */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-800">Nashik APMC Mandi</span>
                <span className="text-slate-600">Local Supply Balance (45%)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 w-[45%] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Key Demand Drivers */}
        <div className="lg:col-span-4 bg-white border border-forest-100 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-extrabold text-forest-900 border-b border-slate-100 pb-3">
            Market Driver Intelligence
          </h3>

          <div className="p-4 rounded-2xl bg-forest-50 border border-forest-100 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-forest-900">
              <AlertCircle className="h-4 w-4 text-emerald-600" />
              <span>Trend Summary</span>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              {activeCropMetric.trendText}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Cold Storage Stocking:</span>
              <span className="font-bold text-slate-800">Low (Fast Clearance)</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Interstate Trader Buying:</span>
              <span className="font-bold text-emerald-700">+35% Active</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Optimal Market Destination:</span>
              <span className="font-bold text-forest-900">Vashi APMC</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
