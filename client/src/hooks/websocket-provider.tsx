import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
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

// Configuration constants
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const RETRY_BACKOFF_FACTOR = 1.5;
const MAX_RETRIES = 5;
const HEARTBEAT_INTERVAL = 30000;

// Provider component
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Clean up timers
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

  // Set up heartbeat ping/pong
  const setupHeartbeat = useCallback((ws: WebSocket) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback(() => {
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, retryCountRef.current),
      MAX_RETRY_DELAY
    );
    // Add random jitter (±10% of delay) to prevent reconnection storms
    return delay + (Math.random() * 0.2 - 0.1) * delay;
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    // Clean up any existing connections or timers
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    clearTimers();
    
    try {
      setConnectionState('connecting');
      
      // Create WebSocket connection with correct path
      // Determine correct WebSocket protocol (wss for HTTPS, ws for HTTP)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Set the WebSocket URL to match the server configuration
      const wsUrl = `${protocol}//${window.location.host}/ws/app`;
      
      console.log('WebSocket: Connecting to', wsUrl);
      
      // Create WebSocket with proper error handling
      const ws = new WebSocket(wsUrl);
      
      // Debug the ready state transitions
      const logReadyState = () => {
        const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        console.log(`WebSocket state: ${states[ws.readyState]}`);
      };
      
      // Log initial state
      logReadyState();
      
      // Connection established
      ws.onopen = () => {
        console.log('WebSocket: Connection established');
        setConnectionState('connected');
        setSocket(ws);
        retryCountRef.current = 0;
        setupHeartbeat(ws);
        
        // Invalidate queries to fetch fresh data after reconnection
        queryClient.invalidateQueries();
      };
      
      // Handle incoming messages
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket: Message received', data);
          
          // Handle different message types
          switch (data.type) {
            case 'meeting:create':
            case 'meeting:update':
            case 'meeting:delete':
              // Invalidate meetings data when changes occur
              queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
              break;
              
            case 'meeting:notes':
              // Invalidate specific meeting data when notes are updated
              queryClient.invalidateQueries({ 
                queryKey: ['/api/meetings', data.meetingId.toString()] 
              });
              queryClient.invalidateQueries({ queryKey: ['/api/meetings/notes'] });
              break;
              
            case 'task:update':
              // Invalidate tasks when changes occur
              queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
              break;
              
            case 'registration:attempt':
              // Dispatch a custom event for registration attempts
              window.dispatchEvent(new MessageEvent('websocket-message', { data: event.data }));
              // Also invalidate registration attempts data if on admin dashboard
              queryClient.invalidateQueries({ queryKey: ['/api/admin/registration-attempts'] });
              break;
              
            case 'system:status':
              // Dispatch a custom event for system status updates
              window.dispatchEvent(new MessageEvent('websocket-message', { data: event.data }));
              
              // Optionally show toast for important system status changes
              if (data.status === 'outage' || data.status === 'degraded') {
                toast({
                  title: data.status === 'outage' ? "System Outage" : "System Degraded",
                  description: data.details || "Some functionality may be limited",
                  variant: "destructive"
                });
              }
              break;
              
            case 'echo':
            case 'ping':
            case 'pong':
              // Just log these message types
              break;
              
            default:
              console.log('WebSocket: Unknown message type', data);
          }
        } catch (error) {
          console.error('WebSocket: Failed to parse message', error);
        }
      };
      
      // Handle connection close
      ws.onclose = (event) => {
        console.log('WebSocket: Connection closed', { 
          code: event.code, 
          reason: event.reason,
          wasClean: event.wasClean 
        });
        
        setConnectionState('disconnected');
        setSocket(null);
        
        // Attempt to reconnect with exponential backoff
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = getBackoffDelay();
          console.log(`WebSocket: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
          
          if (retryCountRef.current === 0) {
            // Only show toast on first reconnection attempt
            toast({
              title: "Connection Lost",
              description: "Attempting to reconnect...",
              variant: "default",
            });
          }
          
          retryCountRef.current++;
          retryTimeoutRef.current = setTimeout(connect, delay);
        } else {
          setConnectionState('error');
          console.error('WebSocket: Max reconnection attempts reached');
          
          toast({
            title: "Connection Error",
            description: "Failed to establish connection. The app will continue to work with limited functionality.",
            variant: "destructive",
          });
        }
      };
      
      // Handle connection errors
      ws.onerror = (error) => {
        console.error('WebSocket: Connection error', error);
        setConnectionState('error');
      };
      
    } catch (error) {
      console.error('WebSocket: Failed to create connection', error);
      setConnectionState('error');
      setSocket(null);
      
      // Attempt to reconnect
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = getBackoffDelay();
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(connect, delay);
      }
    }
  }, [queryClient, getBackoffDelay, setupHeartbeat, clearTimers, socket]);
  
  // Connect on component mount
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      clearTimers();
      if (socket) {
        socket.close();
      }
    };
  }, [connect, clearTimers, socket]);
  
  // Function to send messages
  const send = useCallback((data: any): boolean => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('WebSocket: Error sending message', error);
        return false;
      }
    } else {
      console.warn('WebSocket: Cannot send message - not connected');
      return false;
    }
  }, [socket]);
  
  // Create context value
  const contextValue: WebSocketContextType = {
    isConnected: connectionState === 'connected',
    connectionState,
    send,
    socket
  };
  
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