import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAppStore } from '../store/useAppStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const socketRef = useRef(null);
  const { updateTrackedVehicle, setTrafficAlert } = useAppStore();

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('⚡ Connected to KrishiFlow Socket.io Server');
    });

    socket.on('vehicle:location_changed', (data) => {
      console.log('📍 Real-Time Vehicle Update:', data);
      updateTrackedVehicle(data);
    });

    socket.on('dev:traffic_reroute_event', (alertData) => {
      console.log('🚨 DEV TRIGGER Alert Received:', alertData);
      setTrafficAlert(alertData);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const triggerDevTrafficJam = (routeId = 'm1', coordinates = [73.5, 19.5]) => {
    if (socketRef.current) {
      socketRef.current.emit('dev_simulate_traffic', { routeId, coordinates });
    }
  };

  const startVehicleSimulation = () => {
    if (socketRef.current) {
      socketRef.current.emit('simulation:start_tracking');
    }
  };

  return {
    socket: socketRef.current,
    triggerDevTrafficJam,
    startVehicleSimulation
  };
};
