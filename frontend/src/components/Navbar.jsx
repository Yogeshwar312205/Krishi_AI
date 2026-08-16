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
  UserCheck,
  User,
  Package,
  Globe,
  Landmark,
  Wheat,
  Layers,
  Calendar,
  Navigation,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSocket } from '../hooks/useSocket';
import { useTranslation } from '../hooks/useTranslation';
import { CROP_OPTIONS } from '../utils/constants';
import { Select } from './ui/Select';

// Option labels are built per render from `t` so they re-translate on switch.
const buildRoleOptions = (t) => [
  { value: 'Farmer', label: t('farmerView') },
  { value: 'Driver', label: t('driverView') },
  { value: 'APMC Buyer', label: t('buyerView') },
];

const buildRoleOptionsCompact = (t) => [
  { value: 'Farmer', label: t('farmerShort') },
  { value: 'Driver', label: t('driverShort') },
  { value: 'APMC Buyer', label: t('buyerShort') },
];

// Each language is listed in its own script — the standard for a language picker,
// so a Marathi speaker can find "मराठी" without reading the current language.
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'mr', label: 'मराठी' },
];

export const Navbar = () => {
  const {
    user,
    activeTab,
    setActiveTab,
    cropDetails,
    setCropDetails,
    language,
    setLanguage,
    activeRole,
    setActiveRole,
  } = useAppStore();
  const { triggerDevTrafficJam } = useSocket();
  const { t } = useTranslation();

  const handleRoleChange = (newRole) => {
    // setActiveRole carries the role onto the signed-in user; the account's own
    // name and email stay untouched.
    setActiveRole(newRole);
    setActiveTab('home'); // Reset to home dashboard on role switch
  };

  // Determine effective role
  const currentRole = activeRole || user?.role || 'Farmer';

  // The account tab shows the user's own first name once signed in.
  const accountLabel = (fallbackKey) =>
    user ? (user.name ? user.name.split(' ')[0] : t(fallbackKey)) : t('login');

  // STRICT ROLE-BASED NAVIGATION ITEMS
  let navItems = [];

  if (currentRole === 'Farmer') {
    navItems = [
      { id: 'home', label: t('home'), icon: Home },
      { id: 'forecasting', label: t('forecasting'), icon: TrendingUp },
      { id: 'mandi-comparison', label: t('mandiComparison'), icon: Store },
      { id: 'demand-analysis', label: t('demandAnalysis'), icon: BarChart3 },
      { id: 'profitability', label: t('profitability'), icon: Calculator },
      { id: 'price-alerts', label: t('priceAlerts'), icon: Bell },
      { id: 'book-truck', label: t('bookVehicleDate'), icon: Calendar },
      { id: 'bookings', label: t('bookings'), icon: Package },
      { id: 'auth', label: accountLabel('profile'), icon: UserCheck },
    ];
  } else if (currentRole === 'Driver' || currentRole === 'Transporter') {
    navItems = [
      { id: 'home', label: t('driverWorkstation'), icon: Home },
      { id: 'driver-jobs', label: t('scheduleRequests'), icon: Calendar },
      { id: 'driver-vehicles', label: t('myVehicles'), icon: Truck },
      { id: 'logistics', label: t('liveVRPNavigation'), icon: Navigation },
      { id: 'auth', label: accountLabel('driverProfile'), icon: UserCheck },
    ];
  } else {
    // APMC Buyer / Trader
    navItems = [
      { id: 'home', label: t('buyerDesk'), icon: Landmark },
      { id: 'buyer-postings', label: t('postBuyingRates'), icon: Store },
      { id: 'inbound-shipments', label: t('inboundArrivals'), icon: Truck },
      { id: 'demand-analysis', label: t('marketDemandMetrics'), icon: BarChart3 },
      { id: 'auth', label: accountLabel('merchantProfile'), icon: UserCheck },
    ];
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-forest-100 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Top Main Navbar Row */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center space-x-3 cursor-pointer group shrink-0"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-600 text-white shadow-md group-hover:scale-105 transition-transform">
            <Sprout className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-semibold tracking-tight text-forest-900 leading-none">
              Krushi<span className="text-terracotta-500">Flow</span>
            </span>
            <span className="text-[10px] font-bold text-forest-600 tracking-wider uppercase mt-0.5">
              AI Market Intelligence
            </span>
          </div>
        </div>

        {/* Global Role Switcher, Language & Crop Quick Selector */}
        <div className="hidden md:flex items-center gap-2">
          <Select
            icon={Layers}
            tone="forest"
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            options={buildRoleOptions(t)}
            className="min-w-[9.5rem]"
          />

          <Select
            icon={Globe}
            tone="slate"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            options={LANGUAGE_OPTIONS}
          />

          {currentRole === 'Farmer' && (
            <Select
              icon={Wheat}
              tone="terracotta"
              value={cropDetails.cropType}
              onChange={(e) => setCropDetails({ cropType: e.target.value })}
              options={CROP_OPTIONS.map((c) => ({ value: c, label: c }))}
            />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile role select */}
          <Select
            icon={Layers}
            tone="forest"
            compact
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            options={buildRoleOptionsCompact(t)}
            className="md:hidden"
          />

          <button
            onClick={() => triggerDevTrafficJam('m1', [73.5, 19.5])}
            className="flex items-center space-x-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            title={t('trafficSimTitle')}
          >
            <AlertTriangle className="h-4 w-4 text-amber-100" />
            <span className="hidden sm:inline">{t('trafficSim')}</span>
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
            <span>{user ? user.name || t('profile') : t('login')}</span>
          </button>
        </div>

      </div>

      {/* STRICT ROLE-BASED NAVIGATION SUBBAR */}
      <div className="bg-forest-900 text-white border-t border-forest-800">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8 no-scrollbar">
          <nav className="flex space-x-1 sm:space-x-1.5 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors duration-200 ${
                    isActive
                      ? 'bg-forest-800 text-white font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-forest-800/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-terracotta-400' : 'text-slate-400'}`} strokeWidth={2} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-terracotta-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
