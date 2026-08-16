import React from 'react';
import { Sprout, Truck, Store, CheckCircle, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

export const RoleBar = () => {
  const { activeRole, setActiveRole } = useAppStore();
  const { t } = useTranslation();

  const roles = [
    {
      id: 'Farmer',
      label: t('farmerDashboard'),
      sublabel: t('farmerDashboardSub'),
      icon: Sprout,
      color: 'from-emerald-600 to-forest-800',
      activeBorder: 'border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30'
    },
    {
      id: 'Driver',
      label: t('driverDashboard'),
      sublabel: t('driverDashboardSub'),
      icon: Truck,
      color: 'from-blue-600 to-indigo-800',
      activeBorder: 'border-blue-500 bg-blue-50/90 text-blue-950 ring-2 ring-blue-500/30'
    },
    {
      id: 'APMC Buyer',
      label: t('buyerDashboard'),
      sublabel: t('buyerDashboardSub'),
      icon: Store,
      color: 'from-amber-600 to-orange-800',
      activeBorder: 'border-amber-500 bg-amber-50/90 text-amber-950 ring-2 ring-amber-500/30'
    }
  ];

  // setActiveRole updates the signed-in user's role without touching their identity.
  const handleRoleSelect = (roleId) => setActiveRole(roleId);

  // The stored role is an English key; show it in the reader's language.
  const roleDisplayName = {
    Farmer: t('farmerShort'),
    Driver: t('driverShort'),
    Transporter: t('driverShort'),
    'APMC Buyer': t('buyerShort'),
    Trader: t('buyerShort'),
  }[activeRole] || activeRole;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-md space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            {t('switchRoleMode')}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
          {t('activeView')}: <strong className="text-forest-900 font-extrabold">{roleDisplayName}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = activeRole === r.id || (activeRole === 'Transporter' && r.id === 'Driver') || (activeRole === 'Trader' && r.id === 'APMC Buyer');
          
          return (
            <button
              key={r.id}
              onClick={() => handleRoleSelect(r.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                isActive 
                  ? r.activeBorder 
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs bg-gradient-to-br ${r.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold leading-tight">{r.label}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{r.sublabel}</div>
                </div>
              </div>

              {isActive && (
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
