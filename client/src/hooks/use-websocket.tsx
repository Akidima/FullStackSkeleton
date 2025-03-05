import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface WebSocketContextType {
  isConnected: boolean;
  socket: WebSocket | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const queryClient = useQueryClient();
  const MAX_RETRIES = 5;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 30000;

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let ws: WebSocket;

    function connect() {
      try {
        // Use the current window location to determine the WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // This includes both hostname and port
        const wsUrl = `${protocol}//${host}/ws`;

        console.log('Attempting WebSocket connection to:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.addEventListener('open', () => {
          console.log('WebSocket connected successfully');
          setIsConnected(true);
          setSocket(ws);
          setRetryCount(0); // Reset retry count on successful connection
          toast({
            title: "Connected",
            description: "Real-time updates enabled",
          });
        });

        ws.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type.startsWith('meeting:')) {
              // Invalidate meetings query to trigger a refetch
              queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });

              const messages = {
                'meeting:create': 'New meeting created',
                'meeting:update': 'Meeting updated',
                'meeting:delete': 'Meeting deleted',
                'meeting:notes': 'Meeting notes updated'
              };

              toast({
                title: 'Meeting Update',
                description: messages[data.type as keyof typeof messages]
              });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        ws.addEventListener('close', (event) => {
          console.log('WebSocket disconnected, attempting to reconnect...', event.code, event.reason);
          setIsConnected(false);
          setSocket(null);

          if (retryCount < MAX_RETRIES) {
            // Calculate exponential backoff with maximum delay
            const delay = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
              MAX_RETRY_DELAY
            );
            console.log(`Attempting reconnection in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);

            // Show a toast for the first disconnection
            if (retryCount === 0) {
              toast({
                title: "Connection Lost",
                description: "Attempting to reconnect...",
                variant: "destructive",
              });
            }

            reconnectTimeout = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              connect();
            }, delay);
          } else {
            console.log('Maximum retry attempts reached');
            toast({
              title: "Connection Error",
              description: "Failed to establish WebSocket connection. Please refresh the page.",
              variant: "destructive",
            });
          }
        });

        ws.addEventListener('error', (error) => {
          console.error('WebSocket error:', error);
          // Don't set connection state here, let the close handler do it
        });
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setIsConnected(false);
        setSocket(null);
      }
    }

    // Only attempt to connect if we haven't reached max retries
    if (retryCount < MAX_RETRIES) {
      connect();
    }

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [queryClient, retryCount]);

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