import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  Thermometer, 
  FileText, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ShieldCheck, 
  DollarSign, 
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { WaybillModal } from './WaybillModal';
import { NewBookingModal } from './NewBookingModal';

export const MyBookings = () => {
  const { bookings, setActiveTab } = useAppStore();
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [selectedBookingForWaybill, setSelectedBookingForWaybill] = useState(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

  const { t } = useT();

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'active') return b.status === 'In Transit' || b.status === 'Active';
    if (activeFilter === 'completed') return b.status === 'Completed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-forest-200/80 pb-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-forest-700 uppercase tracking-wider mb-1">
            <Truck className="h-4 w-4 text-emerald-600" />
            <span>{t('transport.bookings.title')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-forest-900 tracking-tight">
            {t('transport.bookings.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl mt-1">
            {t('transport.route.whyExplain')}
          </p>
        </div>

        <button
          onClick={() => setIsNewBookingOpen(true)}
          className="btn-forest-primary px-5 py-3 text-xs flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-md"
        >
          <Plus className="h-4 w-4" />
          <span>{t('transport.book.title')}</span>
        </button>
      </div>

      {/* Filter Tabs & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          {[
            { id: 'all', label: 'All Dispatches' },
            { id: 'active', label: t('transport.bookings.active') },
            { id: 'completed', label: t('transport.bookings.past') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeFilter === tab.id
                  ? 'bg-forest-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <strong className="text-forest-900">{filteredBookings.length}</strong> dispatches
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <Truck className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-black text-slate-800">No Dispatches Found</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              You don't have any dispatches matching this filter. Book a new cold-chain truck to start dispatching crops!
            </p>
            <button
              onClick={() => setActiveTab('logistics')}
              className="btn-forest-primary px-5 py-2.5 text-xs inline-flex items-center gap-2 mt-2"
            >
              <Plus className="h-4 w-4" />
              <span>Book Vehicle Now</span>
            </button>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-forest-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300 space-y-4 relative overflow-hidden"
            >
              {/* Top Row: Dispatch ID & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-forest-50 border border-forest-200 text-forest-700 flex items-center justify-center font-black text-sm shadow-2xs">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-forest-900">{b.id}</span>
                      <span className="text-xs font-bold text-slate-500">• {b.dispatchTime}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">
                      Cargo: <strong className="text-slate-900">{b.quantityKg} kg {b.cropType}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                      b.status === 'In Transit' || b.status === 'Active'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {b.status === 'In Transit' ? (
                      <><Truck className="h-3.5 w-3.5" /> In Transit</>
                    ) : (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Completed</>
                    )}
                  </span>
                </div>
              </div>

              {/* Grid Info Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Column 1: Route & Mandi */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Transport Route
                  </span>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">{b.origin}</div>
                      <div className="text-[11px] text-slate-500">Farm Origin</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 pt-1 border-t border-slate-200/60">
                    <MapPin className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-forest-900">{b.destination}</div>
                      <div className="text-[11px] text-slate-500">Destination APMC Mandi</div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Vehicle & Driver */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Assigned Transport
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Driver:</span>
                    <strong className="text-slate-900 font-bold">{b.driverName}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Vehicle Reg:</span>
                    <strong className="text-forest-800 font-mono font-bold">{b.vehicleNo}</strong>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Temp Control:</span>
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {b.temperature}
                    </span>
                  </div>
                </div>

                {/* Column 3: Payout & Financials */}
                <div className="p-3.5 rounded-2xl bg-forest-900 text-white space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                      Estimated Financials
                    </span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-300 text-[11px]">Gross Revenue:</span>
                      <strong className="text-white font-bold">{b.expectedRevenue}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>Freight & APMC Cess:</span>
                      <span>- {b.transportCost}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-forest-800 flex justify-between items-center">
                    <span className="text-emerald-300 font-bold text-xs">Est. Net Profit:</span>
                    <strong className="text-lg font-black text-emerald-400">{b.netProfit}</strong>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <a
                    href={`tel:${b.driverPhone}`}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-forest-700" />
                    <span>Call Driver ({b.driverPhone})</span>
                  </a>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedBookingForWaybill(b)}
                    className="px-4 py-2 rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-900 text-xs font-extrabold flex items-center gap-1.5 border border-forest-200 shadow-2xs transition-all"
                  >
                    <FileText className="h-3.5 w-3.5 text-forest-700" />
                    <span>{t('transport.bookings.receipt')}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('logistics')}
                    className="btn-forest-primary px-4 py-2 text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>{t('transport.bookings.track')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Render Printable Waybill Modal if selected */}
      {selectedBookingForWaybill && (
        <WaybillModal
          booking={selectedBookingForWaybill}
          onClose={() => setSelectedBookingForWaybill(null)}
        />
      )}

      {/* Render New Booking Modal */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
      />
    </div>
  );
};
