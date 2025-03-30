
import { useState, useEffect } from 'react';

const WS_RECONNECT_DELAY = 1000;
const WS_MAX_RETRIES = 5;

export function useWebSocket(path: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    function connect() {
      try {
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setRetryCount(0);
        };

        socket.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          if (retryCount < WS_MAX_RETRIES) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              connect();
            }, WS_RECONNECT_DELAY * Math.pow(1.5, retryCount));
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        setWs(socket);
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    }

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [retryCount]);

  return { ws, isConnected };
}
