import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

// WebSocket connection states
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Configuration
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const RETRY_BACKOFF_FACTOR = 1.5;
const MAX_RETRIES = 5;

export function useWebSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);

  // Calculate backoff delay with jitter
  const getBackoffDelay = useCallback(() => {
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, retryCountRef.current),
      MAX_RETRY_DELAY
    );
    // Add random jitter (±10% of delay)
    return delay + (Math.random() * 0.2 - 0.1) * delay;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Connecting to WebSocket:', { url: wsUrl, retryCount: retryCountRef.current });
      setConnectionState('connecting');

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setConnectionState('connected');
        retryCountRef.current = 0; // Reset retry count on successful connection
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', { 
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setConnectionState('disconnected');

        // Attempt reconnection with backoff if not manually closed
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = getBackoffDelay();
          console.log(`Scheduling reconnection attempt in ${Math.round(delay)}ms`);
          
          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            connect();
          }, delay);
        } else {
          console.log('Maximum retry attempts reached');
          toast({
            title: 'Connection Error',
            description: 'Unable to establish real-time connection. Please refresh the page.',
            variant: 'destructive'
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle different message types
          switch (data.type) {
            case 'connection:status':
              console.log('Connection status:', data.status);
              break;
            case 'meeting:update':
            case 'meeting:create':
            case 'meeting:delete':
              // Trigger query invalidation or state update
              break;
            default:
              console.log('Received message:', data);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionState('error');
    }
  }, [getBackoffDelay]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
  };
}
