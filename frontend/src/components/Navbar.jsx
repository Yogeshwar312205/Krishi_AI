import React from 'react';
import { 
  Sprout, 
  Home,
  TrendingUp, 
  Store, 
  BarChart3, 
  Calculator, 
  Bell, 
  Truck, 
  AlertTriangle,
  Sparkles,
  UserCheck,
  User,
  Package,
  Globe
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSocket } from '../hooks/useSocket';
import { getTranslation } from '../utils/translations';

export const Navbar = () => {
  const { 
    user,
    backendStatus, 
    aiEngineStatus, 
    activeTab, 
    setActiveTab,
    cropDetails,
    setCropDetails,
    language,
    setLanguage
  } = useAppStore();
  const { triggerDevTrafficJam } = useSocket();

  const t = (key) => getTranslation(language, key);

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'forecasting', label: t('forecasting'), icon: TrendingUp },
    { id: 'mandi-comparison', label: t('mandiComparison'), icon: Store },
    { id: 'demand-analysis', label: t('demandAnalysis'), icon: BarChart3 },
    { id: 'profitability', label: t('profitability'), icon: Calculator },
    { id: 'price-alerts', label: t('priceAlerts'), icon: Bell },
    { id: 'logistics', label: t('logistics'), icon: Truck },
    { id: 'bookings', label: t('bookings'), icon: Package },
    { id: 'auth', label: user ? (user.name ? user.name.split(' ')[0] : t('farmerProfile')) : t('loginRegister'), icon: UserCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-forest-100 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Top Main Navbar Row */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-600 text-white shadow-md group-hover:scale-105 transition-transform">
            <Sprout className="h-6 w-6 stroke-[2.4]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-forest-900 leading-none">
              Krushi<span className="text-[#E67E22]">Flow</span>
            </span>
            <span className="text-[10px] font-bold text-forest-600 tracking-wider uppercase mt-0.5">
              AI Market Intelligence
            </span>
          </div>
        </div>

        {/* Global Language & Crop Quick Selector in Nav */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Language Switcher */}
          <div className="flex items-center space-x-1.5 bg-forest-50 p-1.5 rounded-xl border border-forest-200 text-xs font-bold text-forest-900">
            <Globe className="h-4 w-4 text-emerald-600 pl-1" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white text-forest-900 border border-forest-200 rounded-lg px-2 py-1 font-bold shadow-2xs outline-none cursor-pointer hover:border-forest-400"
            >
              <option value="en">🌐 English</option>
              <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
              <option value="mr">🚩 मराठी (Marathi)</option>
            </select>
          </div>

          {/* Crop Selector */}
          <div className="flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
            <span className="text-slate-500 pl-2">Crop:</span>
            <select 
              value={cropDetails.cropType}
              onChange={(e) => setCropDetails({ cropType: e.target.value })}
              className="bg-white text-forest-900 border border-slate-200 rounded-lg px-2.5 py-1 font-bold shadow-2xs outline-none cursor-pointer hover:border-forest-400"
            >
              {['Tomato', 'Potato', 'Onion', 'Wheat', 'Rice', 'Mango', 'Banana'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* System Microservices Status */}
        <div className="hidden lg:flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-slate-700 font-semibold shadow-2xs">
            <span className={`h-2 w-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>Node Core: <strong className="text-emerald-700">Online</strong></span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-slate-700 font-semibold shadow-2xs">
            <span className={`h-2 w-2 rounded-full ${aiEngineStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>FastAPI AI: <strong className="text-amber-700">Ready</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Mobile language button */}
          <div className="md:hidden flex items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white text-forest-900 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold shadow-2xs outline-none"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="mr">MR</option>
            </select>
          </div>

          <button
            onClick={() => triggerDevTrafficJam('m1', [73.5, 19.5])}
            className="flex items-center space-x-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            title="Simulate sudden traffic blockage on primary market route"
          >
            <AlertTriangle className="h-4 w-4 animate-bounce text-amber-100" />
            <span className="hidden sm:inline">Traffic Sim</span>
          </button>

          <button 
            onClick={() => setActiveTab('auth')}
            className={`px-3.5 py-2 text-xs flex items-center gap-1.5 rounded-xl font-bold transition-all shadow-md active:scale-95 ${
              user 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' 
                : 'bg-forest-800 hover:bg-forest-900 text-white'
            }`}
          >
            {user ? <User className="h-4 w-4 text-emerald-700" /> : <UserCheck className="h-4 w-4" />}
            <span>{user ? user.name || 'Farmer Profile' : 'Farmer Login'}</span>
          </button>
        </div>

      </div>

      {/* Feature Navigation Subbar */}
      <div className="bg-forest-900 text-white border-t border-forest-800">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8 no-scrollbar">
          <nav className="flex space-x-1 sm:space-x-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-emerald-500 text-white shadow-md scale-102 font-extrabold' 
                      : 'text-slate-300 hover:text-white hover:bg-forest-800/80'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
