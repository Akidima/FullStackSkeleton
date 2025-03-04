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
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || '5000'; // Default to server port if client port is not available
    const wsUrl = `${protocol}//${host}:${port}/ws`;

    let reconnectTimeout: NodeJS.Timeout;
    let ws: WebSocket;

    function connect() {
      ws = new WebSocket(wsUrl);

      ws.addEventListener('open', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setSocket(ws);
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

      ws.addEventListener('close', () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        setIsConnected(false);
        setSocket(null);

        // Attempt to reconnect after 2 seconds
        reconnectTimeout = setTimeout(connect, 2000);
      });

      ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
      });
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [queryClient]);

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