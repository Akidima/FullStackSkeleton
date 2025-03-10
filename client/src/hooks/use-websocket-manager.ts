import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface WebSocketManagerOptions {
  url?: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onMessage?: (event: MessageEvent) => void;
}

interface WebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  error: Error | null;
  connectionAttempts: number;
}

export function useWebSocketManager({
  url = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
  reconnectAttempts = 5,
  reconnectInterval = 5000,
  onMessage
}: WebSocketManagerOptions) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isReconnecting: false,
    error: null,
    connectionAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      console.log('WebSocket: Attempting connection to', url);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket: Connection established');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          error: null,
          connectionAttempts: 0
        }));
        toast({
          title: "Connected",
          description: "WebSocket connection established",
        });
      };

      ws.onclose = (event) => {
        console.log('WebSocket: Connection closed', event);
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: new Error(`Connection closed: ${event.reason || 'Unknown reason'}`)
        }));

        // Attempt reconnection if not at limit
        if (state.connectionAttempts < reconnectAttempts) {
          setState(prev => ({
            ...prev,
            isReconnecting: true,
            connectionAttempts: prev.connectionAttempts + 1
          }));

          const backoffDelay = Math.min(
            reconnectInterval * Math.pow(2, state.connectionAttempts),
            30000 // Max 30 second delay
          );

          console.log(`WebSocket: Reconnecting in ${backoffDelay}ms (attempt ${state.connectionAttempts + 1})`);
          reconnectTimeoutRef.current = setTimeout(connect, backoffDelay);
        } else {
          console.log('WebSocket: Max reconnection attempts reached');
          toast({
            title: "Connection Failed",
            description: "Unable to establish WebSocket connection after multiple attempts",
            variant: "destructive"
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket: Error occurred', error);
        setState(prev => ({
          ...prev,
          error: new Error('WebSocket connection error')
        }));
      };

      ws.onmessage = (event) => {
        console.log('WebSocket: Message received', event.data);
        onMessage?.(event);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket: Failed to create connection', error);
      setState(prev => ({
        ...prev,
        error: error as Error,
        isConnected: false
      }));
    }
  }, [url, reconnectAttempts, reconnectInterval, onMessage, state.connectionAttempts]);

  useEffect(() => {
    connect();

    return () => {
      console.log('WebSocket: Cleaning up connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Sending message', data);
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket: Cannot send message - connection not open');
      toast({
        title: "Warning",
        description: "Cannot send message - connection not open",
        variant: "destructive"
      });
    }
  }, []);

  return {
    ...state,
    send,
    socket: wsRef.current
  };
}