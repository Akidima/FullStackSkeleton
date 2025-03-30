import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

// Export wss for status endpoint
export let wss: WebSocketServer;

// Backoff configuration
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_DECAY = 1.5;

// Add isValidOrigin function (placeholder - needs actual implementation)
const isValidOrigin = (origin: string): boolean => {
  // Replace with your actual origin validation logic
  // This is a placeholder and needs to be implemented based on your security requirements
  return true;
};

export function setupWebSocket(server: Server) {
  console.log('Initializing WebSocket server on path: /ws');

  try {
    // Configure WebSocket server with permissive settings for development
    const wsOptions = { 
      server, 
      path: '/ws',
      // Development-friendly options
      perMessageDeflate: false,
      clientTracking: true,
      // Increase max payload size
      maxPayload: 1024 * 1024 * 5, // 5MB
      // Increase heartbeat interval
      heartbeatInterval: 60000,
      // Allow any origin for development purposes
      verifyClient: (info: any) => {
        console.log('WebSocket connection attempt from:', info.origin || 'unknown origin');
        return true; // Accept all connections in development
      }
    };

    wss = new WebSocketServer(wsOptions);

    // Handle server-level errors
    wss.on('error', (error) => {
      console.error('WebSocket server error:', error.message);
    });

    wss.on('connection', (ws: WebSocket & { isAlive?: boolean; reconnectAttempts?: number }, req) => {
      // Validate origin
      const origin = req.headers.origin;
      if (!origin || !isValidOrigin(origin)) {
        ws.close(1008, 'Invalid origin');
        return;
      }

      // Add ping/pong for connection health check
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      console.log('Client connected to MeetMate WebSocket');

      // Initialize client state
      ws.reconnectAttempts = 0;


      // Send initial connection success message
      try {
        ws.send(JSON.stringify({
          type: 'connection:status',
          status: 'connected',
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        console.error('Error sending initial WebSocket message:', err);
      }

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          console.log('Received WebSocket message:', message.toString());
          // Echo message back to verify connection is working
          ws.send(JSON.stringify({
            type: 'echo',
            message: message.toString(),
            timestamp: new Date().toISOString()
          }));
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      });


      // Setup ping-pong to detect stale connections
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.reconnectAttempts = 0; // Reset reconnect attempts on successful pong
      });

      ws.on('error', (error) => {
        console.error('MeetMate WebSocket client error:', {
          error: error.message,
          timestamp: new Date().toISOString(),
          reconnectAttempts: ws.reconnectAttempts
        });
      });

      ws.on('close', (code, reason) => {
        console.log('Client disconnected from MeetMate WebSocket:', {
          code,
          reason: reason.toString() || 'No reason provided',
          timestamp: new Date().toISOString()
        });
        ws.isAlive = false;
      });
    });

    // Setup interval to check for stale connections with backoff
    const interval = setInterval(() => {
      wss.clients.forEach((ws: WebSocket & { isAlive?: boolean; reconnectAttempts?: number }) => {
        if (ws.isAlive === false) {
          ws.reconnectAttempts = (ws.reconnectAttempts || 0) + 1;
          const backoffDelay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_DECAY, ws.reconnectAttempts),
            MAX_RECONNECT_DELAY
          );

          console.log('Terminating stale MeetMate WebSocket connection:', {
            reconnectAttempts: ws.reconnectAttempts,
            backoffDelay,
            timestamp: new Date().toISOString()
          });

          return ws.terminate();
        }

        ws.isAlive = false;
        try {
          ws.ping();
        } catch (error) {
          console.error('Error pinging MeetMate WebSocket client:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      });
    }, 30000);

    // Cleanup interval on server close
    wss.on('close', () => {
      clearInterval(interval);
      console.log('MeetMate WebSocket server closed');
    });

    console.log('WebSocket server initialized successfully');
    return wss;
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', 
      error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export function broadcastMeetingUpdate(type: 'create' | 'update' | 'delete' | 'notes', meetingId: number) {
  if (!wss?.clients) {
    console.log('MeetMate WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify({
    type: `meeting:${type}`,
    meetingId,
    timestamp: new Date().toISOString()
  });

  let successCount = 0;
  let errorCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (err: any) {
        errorCount++;
        console.error('Error broadcasting MeetMate meeting update:', {
          error: err?.message || 'Unknown error',
          meetingId,
          type,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  console.log('MeetMate broadcast complete:', {
    type,
    meetingId,
    successCount,
    errorCount,
    timestamp: new Date().toISOString()
  });
}

// Broadcast a user registration attempt to admin dashboards
export function broadcastRegistrationAttempt(data: { 
  email: string; 
  ipAddress: string; 
  status: 'success' | 'pending' | 'blocked'; 
  reason?: string;
  userAgent?: string;
}) {
  if (!wss?.clients) {
    console.log('MeetMate WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify({
    type: 'registration:attempt',
    ...data,
    timestamp: new Date().toISOString()
  });

  let successCount = 0;
  let errorCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (err: any) {
        errorCount++;
        console.error('Error broadcasting registration attempt:', {
          error: err?.message || 'Unknown error',
          email: data.email,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  console.log('Registration attempt broadcast complete:', {
    email: data.email,
    status: data.status,
    successCount,
    errorCount,
    timestamp: new Date().toISOString()
  });
}

// Broadcast general system status updates
export function broadcastSystemStatus(status: 'healthy' | 'degraded' | 'outage', details?: string) {
  if (!wss?.clients) {
    console.log('MeetMate WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify({
    type: 'system:status',
    status,
    details,
    timestamp: new Date().toISOString()
  });

  let successCount = 0;
  let errorCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (err: any) {
        errorCount++;
        console.error('Error broadcasting system status:', {
          error: err?.message || 'Unknown error',
          status,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  console.log('System status broadcast complete:', {
    status,
    successCount,
    errorCount,
    timestamp: new Date().toISOString()
  });
}