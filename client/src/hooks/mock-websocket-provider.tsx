import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// WebSocket connection states
type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

// WebSocket context type
interface WebSocketContextType {
  isConnected: boolean;
  connectionState: ConnectionState;
  send: (data: any) => boolean;
  socket: WebSocket | null;
}

// Default context value
const defaultContextValue: WebSocketContextType = {
  isConnected: false,
  connectionState: 'disconnected',
  send: () => false,
  socket: null
};

// Create context
const WebSocketContext = createContext<WebSocketContextType>(defaultContextValue);

// Provider component
export function MockWebSocketProvider({ children }: { children: ReactNode }) {
  // Always show as connected for development purposes
  const [connectionState] = useState<ConnectionState>('connected');
  const queryClient = useQueryClient();

  // Mock send function that simulates successful message sending
  const send = useCallback((data: any): boolean => {
    console.log('Mock WebSocket: Message sent (simulated)', data);
    
    // If this is a registration attempt test, simulate a broadcast
    if (data.type === 'registration:test') {
      console.log('Simulating registration attempt broadcast');
      
      // Invalidate queries to simulate data refresh
      queryClient.invalidateQueries({ queryKey: ['/api/admin/registration-attempts'] });
      
      // Dispatch a simulated websocket event
      setTimeout(() => {
        const mockEvent = {
          type: 'registration:attempt',
          timestamp: new Date().toISOString(),
          data: {
            email: 'test@example.com',
            ipAddress: '192.168.1.1',
            success: false,
            reason: 'Test simulation',
            attemptDate: new Date().toISOString()
          }
        };
        
        window.dispatchEvent(new MessageEvent('websocket-message', { 
          data: JSON.stringify(mockEvent)
        }));
        
        toast({
          title: "Registration Attempt Simulated",
          description: "Mock data has been generated for testing purposes.",
          variant: "default"
        });
      }, 500);
    }
    
    // If this is a system status test, simulate a broadcast
    if (data.type === 'system:test') {
      console.log('Simulating system status broadcast');
      
      setTimeout(() => {
        const mockEvent = {
          type: 'system:status',
          timestamp: new Date().toISOString(),
          status: 'healthy',
          details: 'All systems operational'
        };
        
        window.dispatchEvent(new MessageEvent('websocket-message', { 
          data: JSON.stringify(mockEvent)
        }));
        
        toast({
          title: "System Status Updated",
          description: "All systems operational.",
          variant: "default"
        });
      }, 500);
    }
    
    return true;
  }, [queryClient]);

  // Create context value with simulated "connected" state
  const contextValue: WebSocketContextType = {
    isConnected: true,
    connectionState,
    send,
    socket: null // We don't need an actual socket for mocking
  };
  
  console.log('Using mock WebSocket provider for development');
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use the WebSocket context
export function useMockWebSocket() {
  return useContext(WebSocketContext);
}