import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Sprout, 
  Truck, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  LogOut, 
  UserCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { loginUser, registerUser } from '../services/api';

export const AuthPage = () => {
  const { user, setAuth, logout, setActiveTab } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [role, setRole] = useState('Farmer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: 'Nashik, Maharashtra',
    primaryCrop: 'Tomato'
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const demoCredentials = {
        email: 'ramesh.farmer@krishiflow.ai',
        password: 'password123'
      };
      const res = await loginUser(demoCredentials);
      setAuth(res.user, res.token);
      setSuccessMsg('Successfully logged in as Ramesh Singh (Demo Farmer)!');
      setTimeout(() => {
        setActiveTab('home');
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.email || !formData.password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const res = await loginUser({
          email: formData.email,
          password: formData.password
        });
        setAuth(res.user, res.token);
        setSuccessMsg(`Welcome back, ${res.user.name || 'Farmer'}!`);
        setTimeout(() => {
          setActiveTab('home');
        }, 1000);
      } else {
        const res = await registerUser({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: role,
          location: formData.location,
          primaryCrop: formData.primaryCrop
        });
        setAuth(res.user, res.token);
        setSuccessMsg(`Account created successfully! Welcome to KrishiFlow, ${res.user.name}!`);
        setTimeout(() => {
          setActiveTab('home');
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If already logged in, show Profile View with logout
  if (user) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-forest-100 p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-forest-600 to-emerald-700 text-white flex items-center justify-center text-2xl font-black shadow-md">
                {user.name ? user.name.charAt(0).toUpperCase() : 'K'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl sm:text-2xl font-black text-forest-900">{user.name}</h2>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Active Farmer
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                <div className="flex items-center space-x-3 text-xs text-slate-600 font-semibold mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-forest-600" />
                    <span>Nashik APMC Region</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Tomato Producer</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-2 border border-rose-200 shadow-xs transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>

          <div className="py-6 space-y-4">
            <h3 className="text-sm font-extrabold text-forest-900 uppercase tracking-wider">
              Farmer Account Perks Active
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-forest-50/80 border border-forest-100 space-y-1">
                <div className="text-xs font-bold text-slate-500">AI Price Alerts</div>
                <div className="text-base font-extrabold text-forest-900">SMS Enabled</div>
                <div className="text-[11px] text-emerald-700 font-semibold">+91 98765 43210</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 space-y-1">
                <div className="text-xs font-bold text-slate-500">Logistics VRP</div>
                <div className="text-base font-extrabold text-emerald-900">Priority Fleet</div>
                <div className="text-[11px] text-emerald-700 font-semibold">Cold-Chain Assigned</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-100 space-y-1">
                <div className="text-xs font-bold text-slate-500">Income Multiplier</div>
                <div className="text-base font-extrabold text-amber-900">+22% Net Return</div>
                <div className="text-[11px] text-amber-800 font-semibold">Agmarknet AI Active</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('forecasting')}
              className="btn-forest-primary px-5 py-2.5 text-xs flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>View AI Price Forecast</span>
            </button>

            <button
              onClick={() => setActiveTab('logistics')}
              className="btn-forest-secondary px-5 py-2.5 text-xs flex items-center gap-2"
            >
              <Truck className="h-4 w-4 text-forest-700" />
              <span>Book Refrigerated Truck</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 rounded-full bg-forest-50 border border-forest-200 px-4 py-1 text-xs font-bold text-forest-700">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Secure Kisan AI Portal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-forest-900 tracking-tight">
          Farmer Login & Registration
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl mx-auto">
          Access AI price forecasting, multi-mandi net profit analysis, and cold-chain VRP truck bookings tailored for Indian agriculture.
        </p>
      </div>

      {/* Main Split Authentication Card */}
      <div className="bg-white rounded-3xl border border-forest-100 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side Value Props & Visual Highlights */}
        <div className="lg:col-span-5 bg-gradient-to-br from-forest-900 via-forest-800 to-emerald-950 p-8 text-white flex flex-col justify-between space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-center space-x-2 text-emerald-400 font-black text-lg">
              <Sprout className="h-6 w-6" />
              <span>KrushiFlow AI</span>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-black text-white leading-tight">
                Empowering Farmers with Agmarknet Intelligence
              </h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Join 10,000+ farmers using machine learning to maximize harvest profits and bypass middleman margins.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { title: 'AI Price Forecasting', desc: 'Predict mandi prices up to 30 days ahead.' },
                { title: 'Smart VRP Logistics', desc: 'Book temperature-controlled trucks on demand.' },
                { title: 'Multi-Mandi Net Comparison', desc: 'Calculate true profit after diesel & mandi cess.' },
                { title: 'Instant WhatsApp Alerts', desc: 'Never miss a price spike in your district.' },
              ].map((perk, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold">{perk.title}</strong>
                    <span className="text-slate-300 text-[11px] font-medium">{perk.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Demo Login Callout */}
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs space-y-2 relative z-10">
            <div className="text-xs font-extrabold text-amber-300 flex items-center justify-between">
              <span>Quick Test Access</span>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-200 font-medium">
              Want to test the platform instantly without entering details?
            </p>
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
              <span>1-Click Demo Farmer Login</span>
            </button>
          </div>
        </div>

        {/* Right Side Form (Login / Signup) */}
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
          
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => { setIsLogin(true); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                isLogin 
                  ? 'bg-white text-forest-900 shadow-md border border-slate-200/60' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Farmer Login
            </button>
            
            <button
              onClick={() => { setIsLogin(false); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                !isLogin 
                  ? 'bg-white text-forest-900 shadow-md border border-slate-200/60' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              New Farmer Registration
            </button>
          </div>

          {/* User Role Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
              I am registering/logging in as:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Farmer', label: 'Farmer (Kisan)', icon: Sprout },
                { id: 'Transporter', label: 'Logistics / Fleet', icon: Truck },
                { id: 'Trader', label: 'APMC Buyer', icon: User }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 border transition-all ${
                      isSelected 
                        ? 'bg-forest-50 border-forest-500 text-forest-900 ring-2 ring-forest-500/20' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-forest-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Ramesh Singh"
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Email Address</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="farmer@krishiflow.ai"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Mobile Phone (+91)</label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Primary Crop</label>
                  <select
                    name="primaryCrop"
                    value={formData.primaryCrop}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 bg-white"
                  >
                    {['Tomato', 'Potato', 'Onion', 'Wheat', 'Rice', 'Mango', 'Banana'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-600">
                  <input type="checkbox" defaultChecked className="rounded text-forest-600 focus:ring-forest-500" />
                  <span>Remember me</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); setErrorMsg('Demo reset: Use email "ramesh.farmer@krishiflow.ai" with any password'); }} className="font-bold text-forest-700 hover:underline">
                  Forgot Password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-forest-700 hover:bg-forest-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing Authentication...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Log In to KrishiFlow' : 'Create Farmer Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-500 font-semibold">
              By logging in, you agree to KrishiFlow's <span className="text-forest-700 underline cursor-pointer">Terms of Service</span> and <span className="text-forest-700 underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
