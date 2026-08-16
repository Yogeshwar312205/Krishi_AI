import React, { useState, Suspense, lazy } from 'react';
import {
  Truck,
  MapPin,
  Play,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Thermometer,
  Zap,
  DollarSign,
  Clock,
  PhoneCall,
  ShieldCheck,
  Plus,
  Calendar,
  Layers,
  XCircle,
  Star,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSocket } from '../hooks/useSocket';
import { RegisterVehicleModal } from './RegisterVehicleModal';

// Lazy-loaded: keeps Leaflet out of the initial bundle for farmer/buyer sessions.
const MapView = lazy(() => import('./MapView').then((m) => ({ default: m.MapView })));

export const DriverDashboard = () => {
  const {
    user,
    driverJobs,
    updateDriverJobStatus,
    trackedVehicle,
    trafficAlert,
    clearTrafficAlert,
    registeredVehicles,
    dateBookings,
    respondToDateBooking
  } = useAppStore();

  const { startVehicleSimulation, triggerDevTrafficJam } = useSocket();

  // Header reflects the signed-in driver and their own primary vehicle rather
  // than a fixed demo identity.
  const driverName = user?.name || 'Driver';
  const primaryVehicle = registeredVehicles[0];

  const [isOnDuty, setIsOnDuty] = useState(true);
  const [activeJobId, setActiveJobId] = useState('JOB-301');
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  const activeJob = driverJobs.find((j) => j.id === activeJobId) || driverJobs[0];

  const handleAcceptJob = (jobId) => {
    updateDriverJobStatus(jobId, 'In Transit');
    setActiveJobId(jobId);
  };

  const handleCompleteJob = (jobId) => {
    updateDriverJobStatus(jobId, 'Completed');
  };

  const handleDateBookingResponse = (bookingId, status) => {
    respondToDateBooking(bookingId, status);
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* DRIVER & FLEET TELEMATICS HEADER */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 border-b border-white/10 pb-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-lg">
              <Truck className="h-8 w-8 text-white" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-display text-2xl font-semibold text-white">{driverName}</h1>
                <span className="text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                  Cold-Chain Fleet Transporter
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {primaryVehicle ? (
                  <>
                    Primary Truck: <strong className="text-white">{primaryVehicle.vehicleNo}</strong>{' '}
                    ({primaryVehicle.vehicleType} • {(primaryVehicle.capacityKg / 1000).toFixed(1)} Ton)
                  </>
                ) : (
                  <>No vehicle registered yet — add one to start receiving bookings.</>
                )}
              </p>
              <div className="flex items-center space-x-4 text-xs text-slate-400 font-medium mt-1">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Base: {primaryVehicle?.baseLocation || 'Not set'}</span>
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Rating: 4.9 (142 Trips)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Add Vehicle & Duty Toggle */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <button
              onClick={() => setShowVehicleModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add / Register Vehicle Details</span>
            </button>

            <button
              onClick={() => setIsOnDuty(!isOnDuty)}
              className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all shadow-md ${
                isOnDuty
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-rose-500 hover:bg-rose-600 text-white'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${isOnDuty ? 'bg-white animate-ping' : 'bg-slate-300'}`} />
              <span>{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry Sensors Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10 text-xs">
          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Cargo Temp Sensor</span>
              <Thermometer className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-300">11°C</div>
            <div className="text-[10px] text-emerald-400 font-bold">Optimal Cold-Chain</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>GPS Speed & Status</span>
              <Navigation className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-xl font-black text-white">{trackedVehicle.speedKmH || 58} km/h</div>
            <div className="text-[10px] text-blue-300 font-bold">Live Tracking Active</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Fuel Level</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-300">78% Diesel</div>
            <div className="text-[10px] text-slate-300 font-medium">Range: ~420 km</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Monthly Earnings</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-300">₹48,500</div>
            <div className="text-[10px] text-slate-300 font-medium">14 Dispatches Completed</div>
          </div>
        </div>
      </section>

      {/* DRIVER VEHICLE REGISTRATION MODAL */}
      <RegisterVehicleModal isOpen={showVehicleModal} onClose={() => setShowVehicleModal(false)} />

      {/* DATE-BASED FARMER UBER-LIKE BOOKING REQUESTS ACCEPTANCE SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-forest-200/80 pb-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider mb-0.5">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Uber-Like Schedule Requests</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-forest-900 tracking-tight">
              Incoming Date-Based Farmer Booking Requests
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Farmers schedule vehicle bookings for future harvest dates. Review and accept or decline.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dateBookings.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-blue-700 text-sm">{b.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    b.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' : 
                    b.status === 'Declined' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-black text-slate-900">{b.cropType} ({b.quantityKg} kg)</h4>
                  <p className="text-slate-600 font-semibold">Farmer: {b.farmerName} • {b.farmerPhone}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Scheduled Pickup Date:</span>
                    <strong className="text-blue-900 font-extrabold text-sm">{b.pickupDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Time Window:</span>
                    <span className="text-slate-800 font-bold">{b.timeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Requested Truck:</span>
                    <span className="text-slate-800 font-bold">{b.vehicleNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Route:</span>
                    <span className="text-slate-700 font-medium inline-flex items-center gap-1">{b.origin} <ArrowRight className="h-3 w-3 text-slate-400" /> {b.destination}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm font-black text-forest-900 pt-1">
                  <span>Guaranteed Freight Payout:</span>
                  <span className="text-emerald-700 text-base">{b.estTotalFare}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                {b.status === 'Pending Driver Acceptance' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDateBookingResponse(b.id, 'Declined')}
                      className="flex-1 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs rounded-xl transition-all"
                    >
                      Decline Request
                    </button>
                    <button
                      onClick={() => handleDateBookingResponse(b.id, 'Accepted')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Accept Booking ({b.estTotalFare})</span>
                    </button>
                  </div>
                ) : b.status === 'Accepted' ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 w-full">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Booking Accepted for {b.pickupDate}! Scheduled in your calendar.</span>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold text-center">
                    Booking Request Declined
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MY REGISTERED VEHICLES FLEET */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-forest-200/80 pb-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-forest-900 tracking-tight">
              My Registered Vehicles Fleet
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Trucks you have published on the platform for farmer bookings.
            </p>
          </div>

          <button
            onClick={() => setShowVehicleModal(true)}
            className="btn-forest-primary px-4 py-2 text-xs flex items-center gap-1.5 shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Vehicle</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {registeredVehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-forest-900 text-base">{v.vehicleNo}</span>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  {v.isAvailable ? 'Available' : 'Booked'}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <div className="font-bold text-slate-800">{v.vehicleType}</div>
                <div>Capacity: <strong className="text-slate-900">{v.capacityKg.toLocaleString()} kg</strong></div>
                <div>Freight Rate: <strong className="text-emerald-700">₹{v.ratePerKm} / km</strong></div>
                <div>Temp Control: {v.tempSensor}</div>
                <div>Hub: {v.baseLocation}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE VRP ROUTE MAP & NAVIGATION SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-forest-200/80 pb-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider mb-0.5">
              <Navigation className="h-4 w-4 text-blue-600" />
              <span>Real-Time Navigation Guidance</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-forest-900 tracking-tight">
              Active VRP Navigation & Smart Rerouting
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startVehicleSimulation}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Simulate Movement</span>
            </button>

            <button
              onClick={() => triggerDevTrafficJam('m1', [73.5, 19.5])}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Simulate Jam</span>
            </button>
          </div>
        </div>

        {/* Map View Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Suspense fallback={<div className="krushi-card h-full min-h-[320px] animate-pulse" />}>
              <MapView />
            </Suspense>
          </div>

          {/* Active Job Guidance Panel */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Trip Task</span>
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {activeJob?.status || 'In Transit'}
                </span>
              </div>

              <div>
                <div className="text-sm font-black text-forest-900">{activeJob?.cropType} Shipment ({activeJob?.quantityKg} kg)</div>
                <div className="text-xs text-slate-500 font-semibold">Farmer: {activeJob?.farmerName}</div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-forest-50 border border-forest-100 space-y-1">
                  <div className="text-forest-800 font-bold flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-forest-600" />
                    <span>Pickup Origin</span>
                  </div>
                  <div className="text-slate-700 font-medium pl-4">{activeJob?.origin}</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1">
                  <div className="text-emerald-900 font-bold flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Destination APMC</span>
                  </div>
                  <div className="text-slate-700 font-medium pl-4">{activeJob?.destination}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {activeJob?.status === 'In Transit' && (
                <button
                  onClick={() => handleCompleteJob(activeJob.id)}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mark Shipment Delivered</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
