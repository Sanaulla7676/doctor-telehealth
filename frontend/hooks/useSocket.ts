import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const RENDER_BACKEND_URL = 'https://doctor-telehealth.onrender.com';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Establish connection to backend
    const socketInstance = io(RENDER_BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketInstance.on('connect', () => {
      console.log('Real-time websocket connected successfully');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socket;
}
