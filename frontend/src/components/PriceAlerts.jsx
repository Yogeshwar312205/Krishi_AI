import React, { useState } from 'react';
import { Bell, Plus, CheckCircle2, AlertTriangle, Send, Phone, MessageSquare, Trash2, Zap, ShieldCheck, Wheat, Store } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { sendPriceAlertSms } from '../services/api';
import { CROP_OPTIONS } from '../utils/constants';
import { Select } from './ui/Select';

const MANDI_OPTIONS = [
  { value: 'Vashi Wholesale APMC (Mumbai)', label: 'Vashi Wholesale APMC (Mumbai)' },
  { value: 'Nashik APMC Mandi', label: 'Nashik APMC Mandi' },
  { value: 'Gultekdi APMC Market (Pune)', label: 'Gultekdi APMC Market (Pune)' },
  { value: 'Surat APMC Hub', label: 'Surat APMC Hub' },
];

const CHANNEL_OPTIONS = [
  { value: 'SMS & WhatsApp', label: 'SMS & WhatsApp' },
  { value: 'WhatsApp Only', label: 'WhatsApp Only' },
  { value: 'In-App Push Only', label: 'In-App Push Only' },
];

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
    const alertText = `"${alert.crop} price in ${alert.mandi} has reached ₹${alert.targetPrice}/kg!"`;
    try {
      await sendPriceAlertSms({
        phone: alert.phone,
        cropType: alert.crop,
        targetPrice: alert.targetPrice,
        currentPrice: alert.currentPrice,
        mandiName: alert.mandi
      });
      setSimulatedAlert({ ok: true, text: `SMS sent to ${alert.phone}: ${alertText}` });
    } catch (err) {
      // Previously both branches claimed delivery, so a dead SMS gateway still
      // reported success. Say what actually happened.
      setSimulatedAlert({
        ok: false,
        text: `Could not send the SMS to ${alert.phone}. ${err.message}`
      });
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
            <Bell className="h-3.5 w-3.5 text-emerald-300" />
            <span>Instant SMS & WhatsApp Price Alerts</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Market Price Alerts & Notifications
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            Never miss a profitable market spike! Set custom target prices for your crops, and KrishiFlow will automatically notify you via SMS/WhatsApp when Mandi prices hit your target.
          </p>
        </div>
      </div>

      {/* Alert delivery result banner */}
      {simulatedAlert && (
        <div
          role="status"
          className={`p-4 rounded-2xl text-white font-bold text-sm shadow-xl flex items-center justify-between gap-4 ${
            simulatedAlert.ok ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            {simulatedAlert.ok
              ? <Zap className="h-5 w-5 fill-amber-300 text-amber-300 shrink-0" />
              : <AlertTriangle className="h-5 w-5 shrink-0" />}
            <span>{simulatedAlert.text}</span>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-md shrink-0 whitespace-nowrap">
            {simulatedAlert.ok ? 'SMS Delivered' : 'Send Failed'}
          </span>
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
              <Select
                icon={Wheat}
                tone="slate"
                value={newCrop}
                onChange={(e) => setNewCrop(e.target.value)}
                options={CROP_OPTIONS.map((c) => ({ value: c, label: c }))}
                className="w-full"
              />
            </div>

            {/* Target Mandi */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Target APMC Mandi</label>
              <Select
                icon={Store}
                tone="slate"
                value={newMandi}
                onChange={(e) => setNewMandi(e.target.value)}
                options={MANDI_OPTIONS}
                className="w-full"
              />
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
              <Select
                icon={MessageSquare}
                tone="slate"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                options={CHANNEL_OPTIONS}
                className="w-full"
              />
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
