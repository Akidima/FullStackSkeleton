import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;

// Backoff configuration
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_DECAY = 1.5;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws/app' }); // Changed path to avoid conflicts

  wss.on('connection', (ws: WebSocket & { isAlive?: boolean; reconnectAttempts?: number }) => {
    console.log('Client connected to MeetMate WebSocket');

    // Initialize client state
    ws.isAlive = true;
    ws.reconnectAttempts = 0;

    // Send initial connection success message
    ws.send(JSON.stringify({
      type: 'connection:status',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));

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
        reason: reason.toString(),
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
          error: error.message,
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

  return wss;
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
      } catch (error) {
        errorCount++;
        console.error('Error broadcasting MeetMate meeting update:', {
          error: error.message,
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