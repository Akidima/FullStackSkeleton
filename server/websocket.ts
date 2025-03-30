import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

// Export wss for status endpoint
export let wss: WebSocketServer;

// Backoff configuration
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_DECAY = 1.5;

// More permissive origin validation for development
const ALLOWED_ORIGINS = [
  'https://meetmate.repl.co',
  'https://meetmate.replit.app',
  'https://meetmate.dev'
];

const MAX_CONNECTIONS_PER_IP = 5;
const ipConnections = new Map<string, number>();

const isValidOrigin = (origin: string): boolean => {
  // In development, accept all origins
  if (process.env.NODE_ENV === 'development') return true;
  
  // For production, be more strict
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || 
         origin.endsWith('.repl.co') || 
         origin.endsWith('.replit.app') ||
         origin.includes('replit.dev');
};

const enforceConnectionLimit = (ip: string): boolean => {
  const currentConnections = ipConnections.get(ip) || 0;
  if (currentConnections >= MAX_CONNECTIONS_PER_IP) return false;
  ipConnections.set(ip, currentConnections + 1);
  return true;
};

export function setupWebSocket(server: Server) {
  console.log('Initializing WebSocket server on path: /ws');

  try {
    // Configure WebSocket server with permissive settings for development
    const wsOptions = { 
      server, // Attach to the existing HTTP server
      path: '/ws',
      perMessageDeflate: false,
      clientTracking: true,
      maxPayload: 1024 * 1024 * 5,
      heartbeatInterval: 30000,
      verifyClient: () => true // Allow all connections for now
      // Removed conflicting host and port options
    };

    wss = new WebSocketServer(wsOptions);

    // Handle server-level errors
    wss.on('error', (error) => {
      console.error('WebSocket server error:', error.message);
    });

    wss.on('connection', (ws: WebSocket & { isAlive?: boolean; reconnectAttempts?: number }, req) => {
      // Validate origin (skip in development)
      if (process.env.NODE_ENV !== 'development') {
        const origin = req.headers.origin;
        if (!origin || !isValidOrigin(origin)) {
          ws.close(1008, 'Invalid origin');
          return;
        }
      }

      console.log('Client connected to MeetMate WebSocket');

      // Initialize client state
      ws.isAlive = true;
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

// Broadcast voice command processing results
export function broadcastVoiceCommand(userId: number, commandResponse: {
  understood: boolean;
  commandType: string;
  processedCommand: string;
  params: Record<string, any>;
  userFeedback: string;
  confidence: number;
  alternativeInterpretations?: string[];
}) {
  if (!wss?.clients) {
    console.log('MeetMate WebSocket server not initialized for voice command broadcast');
    return;
  }

  const message = JSON.stringify({
    type: 'voice:command',
    userId,
    command: commandResponse,
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
        console.error('Error broadcasting voice command:', {
          error: err?.message || 'Unknown error',
          userId,
          commandType: commandResponse.commandType,
          understood: commandResponse.understood,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  console.log('Voice command broadcast complete:', {
    userId,
    commandType: commandResponse.commandType,
    understood: commandResponse.understood,
    confidence: commandResponse.confidence,
    successCount,
    errorCount,
    timestamp: new Date().toISOString()
  });
}

// Broadcast calendar events updates to connected clients
export function broadcastCalendarUpdate(
  type: 'sync' | 'remove' | 'update' | 'fetch',
  userId: number,
  meetingId?: number,
  provider?: string
) {
  if (!wss?.clients) {
    console.log('MeetMate WebSocket server not initialized for calendar update broadcast');
    return;
  }

  const message = JSON.stringify({
    type: `calendar:${type}`,
    userId,
    meetingId,
    provider,
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
        console.error('Error broadcasting calendar update:', {
          error: err?.message || 'Unknown error',
          userId,
          type,
          meetingId,
          provider,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  console.log('Calendar update broadcast complete:', {
    type,
    userId,
    meetingId,
    provider,
    successCount,
    errorCount,
    timestamp: new Date().toISOString()
  });
}