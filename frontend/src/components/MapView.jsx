import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '../store/useAppStore';
import { Navigation, Truck, MapPin, AlertCircle } from 'lucide-react';

const farmIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const marketIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const truckIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ChangeMapView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 9, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

export const MapView = () => {
  const { farmerOrigin, selectedRecommendation, trackedVehicle, trafficAlert } = useAppStore();

  const farmLatLng = [farmerOrigin[1], farmerOrigin[0]];
  const marketLatLng = selectedRecommendation
    ? [selectedRecommendation.marketCoordinates[1], selectedRecommendation.marketCoordinates[0]]
    : [19.0760, 73.0012];

  const vehicleLatLng = trackedVehicle?.currentCoordinates
    ? [trackedVehicle.currentCoordinates[1], trackedVehicle.currentCoordinates[0]]
    : [19.9975, 73.7898];

  const normalRoutePolyline = [farmLatLng, vehicleLatLng, marketLatLng];

  const activePolyline = (trafficAlert && trafficAlert.newPolylineWaypoints)
    ? trafficAlert.newPolylineWaypoints
    : normalRoutePolyline;

  const polylineColor = trafficAlert ? '#d97706' : '#18532B';

  return (
    <div className="krushi-card relative h-[480px] w-full overflow-hidden rounded-3xl border border-forest-100/80 shadow-xl bg-white">
      {/* Map Header Overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center space-x-2 rounded-full bg-white/95 border border-forest-100 px-4 py-2 shadow-lg backdrop-blur-md">
        <Navigation className="h-4 w-4 text-forest-700" />
        <span className="text-xs font-bold text-forest-900">Live Geospatial VRP Route Tracker</span>
        {trafficAlert && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 animate-pulse">
            <AlertCircle className="h-3 w-3 text-amber-600" /> Detour Active
          </span>
        )}
      </div>

      <MapContainer
        center={farmLatLng}
        zoom={8}
        scrollWheelZoom={false}
        className="h-full w-full bg-slate-100"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeMapView center={farmLatLng} />

        <Marker position={farmLatLng} icon={farmIcon}>
          <Popup>
            <div className="p-1 font-sans">
              <div className="font-bold text-forest-700 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Farmer Origin HQ
              </div>
              <p className="text-xs text-slate-600 mt-1">Nashik Agro Cluster</p>
            </div>
          </Popup>
        </Marker>

        <Marker position={marketLatLng} icon={marketIcon}>
          <Popup>
            <div className="p-1 font-sans">
              <div className="font-bold text-amber-700 flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5" /> {selectedRecommendation?.marketName || 'Target APMC Mandi'}
              </div>
              <p className="text-xs text-slate-600 mt-1">Expected Price: ₹{selectedRecommendation?.predictedPricePerKg || 48}/kg</p>
              <p className="text-xs font-bold text-forest-700">Net Profit: ₹{selectedRecommendation?.netProfit?.toLocaleString('en-IN') || '88,000'}</p>
            </div>
          </Popup>
        </Marker>

        <Marker position={vehicleLatLng} icon={truckIcon}>
          <Popup>
            <div className="p-1 font-sans">
              <div className="font-bold text-blue-700 flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" /> Driver: {trackedVehicle?.driverName || 'Ramesh Kumar'}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">Speed: {trackedVehicle?.speedKmH || 58} km/h</p>
            </div>
          </Popup>
        </Marker>

        <Polyline
          positions={activePolyline}
          color={polylineColor}
          weight={5}
          opacity={0.85}
          dashArray={trafficAlert ? "8, 8" : null}
        />
      </MapContainer>
    </div>
  );
};
