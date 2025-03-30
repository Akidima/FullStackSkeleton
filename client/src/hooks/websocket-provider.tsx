import { createContext, useContext, ReactNode } from 'react';

// Create mock WebSocket context
interface WebSocketContextType {
  isConnected: boolean;
  connectionState: 'connected' | 'connecting' | 'disconnected' | 'error';
  send: (data: any) => boolean;
  socket: WebSocket | null;
}

// For Replit environment, always provide a mock WebSocket connection
const mockWebSocketContext: WebSocketContextType = {
  isConnected: true, // Always report as connected
  connectionState: 'connected',
  send: (data: any) => {
    console.log('Mock WebSocket send:', data);
    return true;
  },
  socket: null // We don't need a real socket
};

const WebSocketContext = createContext<WebSocketContextType>(mockWebSocketContext);

// Provider component
export function WebSocketProvider({ children }: { children: ReactNode }) {
  return (
    <WebSocketContext.Provider value={mockWebSocketContext}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use the WebSocket context
export function useWebSocket() {
  return useContext(WebSocketContext);
}