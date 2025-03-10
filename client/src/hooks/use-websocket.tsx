import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface WebSocketContextType {
  isConnected: boolean;
  socket: WebSocket | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRIES = 5;
const HEARTBEAT_INTERVAL = 30000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timer | null>(null);
  const queryClient = useQueryClient();

  const clearTimers = () => {
    if (retryTimeout) clearTimeout(retryTimeout);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  };

  const setupHeartbeat = (ws: WebSocket) => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
    setHeartbeatInterval(interval);
  };

  const connect = () => {
    try {
      clearTimers();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/app`; // Updated path to match server

      console.log('WebSocket: Attempting connection to', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.addEventListener('open', () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setSocket(ws);
        setRetryCount(0);
        setupHeartbeat(ws);
      });

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong response
          if (data.type === 'pong') return;

          if (data.type.startsWith('meeting:')) {
            // Invalidate the meetings query to refresh the data
            queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });

            // Map of message types to user-friendly messages
            const messages: Record<string, string> = {
              'meeting:create': 'New meeting created',
              'meeting:update': 'Meeting updated',
              'meeting:delete': 'Meeting deleted',
              'meeting:notes': 'Meeting notes updated'
            };

            if (messages[data.type]) {
              toast({
                title: 'Meeting Update',
                description: messages[data.type]
              });
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.addEventListener('close', (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setSocket(null);
        clearTimers();

        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
            MAX_RETRY_DELAY
          );

          // Only show reconnection toast for first attempt
          if (retryCount === 0) {
            toast({
              title: "Connection Lost",
              description: "Attempting to reconnect...",
              variant: "default",
            });
          }

          const timeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, delay);
          setRetryTimeout(timeout);
        } else {
          toast({
            title: "Connection Error",
            description: "Failed to establish connection. The app will continue to work with limited functionality.",
            variant: "destructive",
          });
        }
      });

      ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
      setSocket(null);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      clearTimers();
      if (socket) {
        socket.close();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, socket }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}