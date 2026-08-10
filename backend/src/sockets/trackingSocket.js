const logger = require('../utils/logger');

let vehicleSimulationTimer = null;

const initSockets = (io) => {
  io.on('connection', (socket) => {
    logger.info(`🔌 WebSocket Client Connected: ${socket.id}`);

    socket.emit('system:status', { message: 'Connected to KrishiFlow Real-Time Logistics WebSocket Engine' });

    // Event 1: Driver location updates
    socket.on('driver_location_update', (data) => {
      logger.info(`📍 Driver location update received: ${JSON.stringify(data)}`);
      io.emit('vehicle:location_changed', data);
    });

    // Event 2: Dev Trigger Traffic Jam Simulation
    socket.on('dev_simulate_traffic', (data) => {
      logger.warn(`⚠️ DEV TRIGGER: Simulated Traffic Jam on Route ${data?.routeId || 'Primary'}`);

      const trafficAlert = {
        timestamp: new Date().toISOString(),
        routeId: data?.routeId || 'm1',
        blockedCoordinates: data?.coordinates || [73.5, 19.5],
        delayMinutes: 45,
        impact: 'HIGH_TRAFFIC_JAM',
        message: '🚨 Traffic disruption detected on primary route! Triggering real-time VRP route recalculation...',
        newPolylineWaypoints: [
          [19.9975, 73.7898], // Nashik Farm
          [19.7000, 73.6500], // Detour path
          [19.3000, 73.3000],
          [19.0760, 73.0012]  // Mumbai Vashi APMC
        ],
        recalculatedMetrics: {
          newDistanceKm: 182,
          newTravelTimeHours: 4.1,
          newSpoilageRiskPercent: 12.4,
          newNetProfit: 86400,
          adjustedCost: 3276
        }
      };

      io.emit('dev:traffic_reroute_event', trafficAlert);
    });

    // Event 3: Vehicle simulator stream
    socket.on('simulation:start_tracking', () => {
      if (vehicleSimulationTimer) clearInterval(vehicleSimulationTimer);

      let step = 0;
      const startCoord = [19.9975, 73.7898]; // Nashik
      const endCoord = [19.0760, 73.0012];   // Mumbai Vashi

      vehicleSimulationTimer = setInterval(() => {
        step = (step + 1) % 20;
        const progress = step / 20;
        const curLat = startCoord[0] + (endCoord[0] - startCoord[0]) * progress;
        const curLng = startCoord[1] + (endCoord[1] - startCoord[1]) * progress;

        io.emit('vehicle:location_changed', {
          vehicleId: 'VEH-9988',
          driverName: 'Ramesh Kumar',
          currentCoordinates: [curLng, curLat],
          speedKmH: Math.round(55 + Math.random() * 10),
          progressPercent: Math.round(progress * 100)
        });
      }, 2000);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 WebSocket Client Disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSockets };
