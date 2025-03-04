import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type.startsWith('meeting:')) {
        // Invalidate meetings query to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
        
        const messages = {
          'meeting:create': 'New meeting created',
          'meeting:update': 'Meeting updated',
          'meeting:delete': 'Meeting deleted'
        };
        
        toast({
          title: 'Meeting Update',
          description: messages[data.type as keyof typeof messages]
        });
      }
    });

    socket.addEventListener('close', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    return () => {
      socket.close();
    };
  }, [queryClient]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
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
