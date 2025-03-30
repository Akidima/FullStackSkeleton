import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

interface WebSocketContextType {
  isConnected: boolean;
  connectionState: ConnectionState;
  send: (data: any) => boolean;
  socket: WebSocket | null;
}

const defaultContextValue: WebSocketContextType = {
  isConnected: false,
  connectionState: 'disconnected',
  send: () => false,
  socket: null
};

const WebSocketContext = createContext<WebSocketContextType>(defaultContextValue);

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const RETRY_BACKOFF_FACTOR = 1.5;
const MAX_RETRIES = 5;
const HEARTBEAT_INTERVAL = 30000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const clearTimers = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const getBackoffDelay = useCallback(() => {
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, retryCountRef.current),
      MAX_RETRY_DELAY
    );
    return delay + (Math.random() * 0.2 - 0.1) * delay;
  }, []);

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      setConnectionState('connecting');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionState('connected');
        setSocket(ws);
        retryCountRef.current = 0;

        // Set up heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        setSocket(null);
        clearTimers();

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = getBackoffDelay();
          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        setConnectionState('error');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'meeting:update') {
            queryClient.invalidateQueries(['meetings']);
          } else if (data.type === 'task:update') {
            queryClient.invalidateQueries(['tasks']);
          } else if (data.type === 'notes:update') {
            queryClient.invalidateQueries(['notes']);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setConnectionState('error');
    }
  }, [socket, clearTimers, getBackoffDelay, queryClient]);

  useEffect(() => {
    connect();
    return () => {
      clearTimers();
      if (socket) {
        socket.close();
      }
    };
  }, [connect, clearTimers, socket]);

  const send = useCallback((data: any): boolean => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, [socket]);

  const value = {
    isConnected: connectionState === 'connected',
    connectionState,
    send,
    socket
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export { WebSocketContext };