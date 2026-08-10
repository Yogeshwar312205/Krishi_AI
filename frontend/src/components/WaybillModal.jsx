import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  ShieldCheck, 
  QrCode, 
  Truck, 
  MapPin, 
  Calendar, 
  Thermometer, 
  Award,
  Download
} from 'lucide-react';

export const WaybillModal = ({ booking, onClose }) => {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-forest-100 my-8">
        
        {/* Header bar with controls */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-forest-900 uppercase tracking-wider">
              Official APMC Consignment Certificate & Gate Pass
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Download PDF</span>
            </button>
            
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE WAYBILL DOCUMENT CONTENT */}
        <div className="space-y-6 text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
          
          {/* Document Title Header */}
          <div className="flex items-start justify-between border-b-2 border-forest-800 pb-4">
            <div>
              <div className="flex items-center space-x-2 text-forest-900 font-black text-xl">
                <span>KrushiFlow Logistics AI</span>
                <span className="text-[10px] bg-forest-100 text-forest-800 font-bold px-2 py-0.5 rounded-md border border-forest-200">
                  APMC Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                Government Agmarknet Stream & Cold-Chain VRP Transit License
              </p>
            </div>

            {/* QR Code & License Badge */}
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-slate-100 rounded-xl border border-slate-300 flex flex-col items-center">
                <QrCode className="h-10 w-10 text-slate-900" />
                <span className="text-[8px] font-mono font-bold text-slate-600 mt-0.5">APMC-QR-{booking.id}</span>
              </div>
            </div>
          </div>

          {/* Consignment Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-forest-50/60 border border-forest-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Waybill Serial No.</span>
              <strong className="text-forest-900 font-mono font-extrabold text-sm">{booking.id}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Dispatch Date & Time</span>
              <strong className="text-slate-900 font-bold">{booking.dispatchTime}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Vehicle Reg No.</span>
              <strong className="text-forest-800 font-bold">{booking.vehicleNo}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Status</span>
              <span className="inline-block px-2 py-0.5 bg-emerald-500 text-white font-extrabold text-[10px] rounded-md">
                {booking.status}
              </span>
            </div>
          </div>

          {/* Route & Driver Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Origin & Destination */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <span className="font-extrabold text-slate-900 block border-b border-slate-100 pb-2">
                Transit Route
              </span>
              
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Origin Farm / Hub</span>
                  <strong className="text-slate-900 font-bold">{booking.origin}</strong>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Destination APMC Mandi</span>
                  <strong className="text-forest-900 font-bold">{booking.destination}</strong>
                </div>
              </div>
            </div>

            {/* Driver & Temperature Info */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <span className="font-extrabold text-slate-900 block border-b border-slate-100 pb-2">
                Vehicle & Driver
              </span>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Assigned Driver:</span>
                <strong className="text-slate-900 font-bold">{booking.driverName}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Driver Contact:</span>
                <strong className="text-forest-700 font-bold">{booking.driverPhone}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Fleet Type:</span>
                <span className="font-bold text-slate-800">{booking.vehicleType}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Cold Storage Log:</span>
                </span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {booking.temperature}
                </span>
              </div>
            </div>
          </div>

          {/* Financials & Payout Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-black text-emerald-400">Consignment Commodity:</span>
              <strong className="text-base text-white">{booking.quantityKg} kg — {booking.cropType}</strong>
            </div>

            <div className="space-y-1.5 pt-1 text-slate-300">
              <div className="flex justify-between">
                <span>Estimated Gross APMC Sale Value:</span>
                <strong className="text-white">{booking.expectedRevenue}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cold-Chain VRP Freight Cost:</span>
                <span>- {booking.transportCost}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>APMC Mandi Cess Tax (0.5%):</span>
                <span>Included</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-sm">
              <span className="font-black text-emerald-300">Est. Net Farmer Payout:</span>
              <strong className="text-xl font-black text-emerald-400">{booking.netProfit}</strong>
            </div>
          </div>

          {/* Signatures & Seal Footer */}
          <div className="pt-4 flex items-end justify-between border-t border-slate-200 text-[10px] text-slate-500 font-semibold">
            <div className="space-y-1">
              <div className="flex items-center space-x-1 text-forest-800 font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Verified by KrishiFlow VRP Telematics Engine</span>
              </div>
              <p>Scan QR code at APMC Entry Gate 2 for priority fast-track unloading.</p>
            </div>

            <div className="text-center space-y-1">
              <div className="h-8 border-b border-slate-400 w-32 mx-auto" />
              <span>Driver / Inspector Signature</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
