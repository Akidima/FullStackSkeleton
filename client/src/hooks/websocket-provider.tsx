import { createContext, useContext, ReactNode } from 'react';
import { useWebSocketSimple } from './use-websocket-simple';

// Create WebSocket context
type WebSocketContextType = ReturnType<typeof useWebSocketSimple>;

const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Provider component
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsContext = useWebSocketSimple();

  return (
    <WebSocketContext.Provider value={wsContext}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use the WebSocket context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}