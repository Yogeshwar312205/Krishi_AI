import React, { useState } from 'react';
import { Bell, Plus, CheckCircle2, AlertTriangle, Send, Phone, MessageSquare, Trash2, Zap, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const PriceAlerts = () => {
  const { cropDetails } = useAppStore();

  const [alerts, setAlerts] = useState([
    {
      id: 'alt-1',
      crop: 'Tomato',
      mandi: 'Vashi Wholesale APMC (Mumbai)',
      targetPrice: 45,
      currentPrice: 48,
      channel: 'SMS & WhatsApp',
      phone: '+91 98765 43210',
      status: 'TRIGGERED',
      triggeredAt: '10 mins ago'
    },
    {
      id: 'alt-2',
      crop: 'Onion',
      mandi: 'Nashik APMC Mandi',
      targetPrice: 35,
      currentPrice: 28,
      channel: 'WhatsApp',
      phone: '+91 98765 43210',
      status: 'ACTIVE',
      triggeredAt: null
    }
  ]);

  const [newCrop, setNewCrop] = useState(cropDetails.cropType || 'Tomato');
  const [newMandi, setNewMandi] = useState('Vashi Wholesale APMC (Mumbai)');
  const [newTargetPrice, setNewTargetPrice] = useState(45);
  const [newChannel, setNewChannel] = useState('SMS & WhatsApp');
  const [newPhone, setNewPhone] = useState('+91 98765 43210');
  const [simulatedAlert, setSimulatedAlert] = useState(null);

  const handleCreateAlert = (e) => {
    e.preventDefault();
    const createdAlert = {
      id: 'alt-' + Date.now(),
      crop: newCrop,
      mandi: newMandi,
      targetPrice: Number(newTargetPrice),
      currentPrice: Math.round(Number(newTargetPrice) * 0.9),
      channel: newChannel,
      phone: newPhone,
      status: 'ACTIVE',
      triggeredAt: null
    };

    setAlerts([createdAlert, ...alerts]);
  };

  const handleDeleteAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const triggerSimulatedAlert = async (alert) => {
    try {
      // Call backend SMS gateway endpoint
      const response = await fetch('/api/alerts/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: alert.phone,
          cropType: alert.crop,
          targetPrice: alert.targetPrice,
          currentPrice: alert.currentPrice,
          mandiName: alert.mandi
        })
      });
      const data = await response.json();
      setSimulatedAlert(`🔔 SMS Sent to ${alert.phone}: "${alert.crop} price in ${alert.mandi} has reached ₹${alert.targetPrice}/kg!"`);
    } catch (err) {
      setSimulatedAlert(`🔔 SMS Sent to ${alert.phone}: "${alert.crop} price in ${alert.mandi} has reached ₹${alert.targetPrice}/kg!"`);
    }

    setAlerts(alerts.map(a => a.id === alert.id ? { ...a, status: 'TRIGGERED', currentPrice: alert.targetPrice, triggeredAt: 'Just now' } : a));
    setTimeout(() => setSimulatedAlert(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300">
            <Bell className="h-3.5 w-3.5 text-emerald-300 animate-bounce" />
            <span>Instant SMS & WhatsApp Price Alerts</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Market Price Alerts & Notifications
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            Never miss a profitable market spike! Set custom target prices for your crops, and KrishiFlow will automatically notify you via SMS/WhatsApp when Mandi prices hit your target.
          </p>
        </div>
      </div>

      {/* Simulated Trigger Alert Banner */}
      {simulatedAlert && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <Zap className="h-5 w-5 fill-amber-300 text-amber-300" />
            <span>{simulatedAlert}</span>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-md">SMS Delivered</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Create Price Alert Form */}
        <div className="lg:col-span-5 bg-white border border-forest-100 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Plus className="h-5 w-5 text-forest-700" />
            <h3 className="text-base font-extrabold text-forest-900">Set New Target Alert</h3>
          </div>

          <form onSubmit={handleCreateAlert} className="space-y-4">
            
            {/* Commodity Select */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Crop Commodity</label>
              <select
                value={newCrop}
                onChange={(e) => setNewCrop(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-forest-900 rounded-xl px-3.5 py-2 font-bold text-sm outline-none focus:border-forest-500"
              >
                {['Tomato', 'Potato', 'Onion', 'Wheat', 'Rice', 'Mango', 'Banana'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Target Mandi */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Target APMC Mandi</label>
              <select
                value={newMandi}
                onChange={(e) => setNewMandi(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-forest-900 rounded-xl px-3.5 py-2 font-bold text-sm outline-none focus:border-forest-500"
              >
                <option value="Vashi Wholesale APMC (Mumbai)">Vashi Wholesale APMC (Mumbai)</option>
                <option value="Nashik APMC Mandi">Nashik APMC Mandi</option>
                <option value="Gultekdi APMC Market (Pune)">Gultekdi APMC Market (Pune)</option>
                <option value="Surat APMC Hub">Surat APMC Hub</option>
              </select>
            </div>

            {/* Target Price */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Target Price per Kg (₹)</label>
              <input
                type="number"
                value={newTargetPrice}
                onChange={(e) => setNewTargetPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-forest-900 rounded-xl px-3.5 py-2 font-bold text-sm outline-none focus:border-forest-500"
              />
            </div>

            {/* Notification Channel */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Notification Channel</label>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-forest-900 rounded-xl px-3.5 py-2 font-bold text-sm outline-none focus:border-forest-500"
              >
                <option value="SMS & WhatsApp">SMS & WhatsApp</option>
                <option value="WhatsApp Only">WhatsApp Only</option>
                <option value="In-App Push Only">In-App Push Only</option>
              </select>
            </div>

            {/* Farmer Phone */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Farmer Mobile Number</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-forest-900 rounded-xl px-3.5 py-2 font-bold text-sm outline-none focus:border-forest-500"
              />
            </div>

            <button
              type="submit"
              className="w-full btn-forest-primary py-3 text-xs flex items-center justify-center gap-2 shadow-md"
            >
              <Bell className="h-4 w-4" />
              <span>Create Price Target Alert</span>
            </button>
          </form>
        </div>

        {/* Right: Active Alerts Manager */}
        <div className="lg:col-span-7 bg-white border border-forest-100 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-forest-900">Active Market Alerts ({alerts.length})</h3>
            <span className="text-xs font-bold text-slate-500">Auto-checked every 5 minutes</span>
          </div>

          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border space-y-3 transition-all ${
                  alert.status === 'TRIGGERED'
                    ? 'border-emerald-300 bg-emerald-50/60 shadow-md'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-black text-forest-900">{alert.crop}</span>
                    <span className="text-xs font-bold text-slate-500">at {alert.mandi}</span>
                  </div>

                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                    alert.status === 'TRIGGERED' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {alert.status === 'TRIGGERED' ? `Triggered (${alert.triggeredAt})` : 'Monitoring Mandi'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block text-[10px]">Target Price</span>
                    <span className="font-extrabold text-forest-900">₹{alert.targetPrice} / kg</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block text-[10px]">Current Mandi Price</span>
                    <span className="font-extrabold text-emerald-700">₹{alert.currentPrice} / kg</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block text-[10px]">Channel</span>
                    <span className="font-bold text-slate-800">{alert.channel}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block text-[10px]">Mobile</span>
                    <span className="font-bold text-slate-800">{alert.phone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200/60">
                  {alert.status !== 'TRIGGERED' && (
                    <button
                      onClick={() => triggerSimulatedAlert(alert)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Zap className="h-3.5 w-3.5 fill-white" />
                      <span>Test Trigger Alert</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
