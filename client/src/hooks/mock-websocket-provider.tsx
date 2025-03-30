import { createContext, useContext, ReactNode, useState } from 'react';

// Create mock WebSocket context
interface WebSocketContextType {
  isConnected: boolean;
  connectionState: 'connected' | 'connecting' | 'disconnected' | 'error';
  send: (data: any) => boolean;
  socket: WebSocket | null;
}

// For Replit environment, always provide a mock WebSocket connection
const defaultWebSocketContext: WebSocketContextType = {
  isConnected: true, // Always report as connected
  connectionState: 'connected',
  send: (data: any) => {
    console.log('Mock WebSocket send:', data);
    return true;
  },
  socket: null // We don't need a real socket
};

const WebSocketContext = createContext<WebSocketContextType>(defaultWebSocketContext);

// Provider component
export function WebSocketProvider({ children }: { children: ReactNode }) {
  // Use useState to make this reactive, though the value never changes
  const [contextValue] = useState(defaultWebSocketContext);
  
  console.log('Using mock WebSocket provider');
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use the WebSocket context
export function useWebSocket() {
  return useContext(WebSocketContext);
}