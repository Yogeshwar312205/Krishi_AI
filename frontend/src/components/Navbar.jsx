import React from 'react';
import { Sprout, Server, Cpu, Database, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSocket } from '../hooks/useSocket';

export const Navbar = () => {
  const { backendStatus, aiEngineStatus, dbConnected } = useAppStore();
  const { triggerDevTrafficJam } = useSocket();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-forest-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo matching screenshot */}
        <div className="flex items-center space-x-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 border border-forest-200 shadow-sm">
            <Sprout className="h-7 w-7 text-forest-700 stroke-[2.2]" />
          </div>
          <div className="flex items-center">
            <span className="text-2xl font-extrabold tracking-tight text-forest-700">
              Krushi<span className="text-[#E67E22]">Flow</span>
            </span>
          </div>
        </div>

        {/* Navigation Links matching screenshot */}
        <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-slate-700">
          <a href="#services" className="hover:text-forest-700 transition-colors">Services</a>
          <a href="#how-it-works" className="hover:text-forest-700 transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-forest-700 transition-colors">Pricing</a>
          <a href="#contact" className="hover:text-forest-700 transition-colors">Contact</a>
        </nav>

        {/* Microservice Health Indicators (Clean Pill Tags) */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 rounded-full bg-forest-50 border border-forest-200 px-3 py-1 text-slate-700 font-semibold">
            <span className={`h-2 w-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>Node Core: <strong className="text-forest-700">Active</strong></span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-slate-700 font-semibold">
            <span className={`h-2 w-2 rounded-full ${aiEngineStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>FastAPI VRP: <strong className="text-forest-700">Ready</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Dev Trigger Traffic Jam Simulator */}
          <button
            onClick={() => triggerDevTrafficJam('m1', [73.5, 19.5])}
            className="flex items-center space-x-1.5 rounded-full bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            title="Simulate sudden traffic blockage on primary market route"
          >
            <AlertTriangle className="h-4 w-4 animate-bounce text-amber-100" />
            <span className="hidden sm:inline">Dev Trigger: Traffic Jam</span>
          </button>

          {/* Primary Pill Button matching screenshot "Open Portal" */}
          <button className="btn-forest-primary px-6 py-2.5 text-sm flex items-center gap-2">
            <span>Open Portal</span>
          </button>
        </div>

      </div>
    </header>
  );
};
