import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { RoleBar } from './RoleBar';
import { FarmerDashboard } from './FarmerDashboard';
import { DriverDashboard } from './DriverDashboard';
import { BuyerDashboard } from './BuyerDashboard';

export const HomePage = () => {
  const { activeRole, user } = useAppStore();

  // Determine current effective role (from state activeRole or user role)
  const currentRole = activeRole || user?.role || 'Farmer';

  return (
    <div className="space-y-6">
      {/* Top Dashboard Role Switcher Bar */}
      <RoleBar />

      {/* DYNAMIC DASHBOARD CONTENT TAILORED TO USER ROLE */}
      {currentRole === 'Farmer' && <FarmerDashboard />}

      {(currentRole === 'Driver' || currentRole === 'Transporter') && <DriverDashboard />}

      {(currentRole === 'APMC Buyer' || currentRole === 'Trader' || currentRole === 'Buyer') && <BuyerDashboard />}
    </div>
  );
};

export default HomePage;
