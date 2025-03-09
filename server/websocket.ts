import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to MeetMate WebSocket');

    // Send initial connection success message
    ws.send(JSON.stringify({
      type: 'connection:status',
      status: 'connected'
    }));

    // Setup ping-pong to detect stale connections
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (error) => {
      console.error('MeetMate WebSocket client error:', error);
    });

    ws.on('close', () => {
      console.log('Client disconnected from MeetMate WebSocket');
    });
  });

  // Setup interval to check for stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) {
        console.log('Terminating stale MeetMate WebSocket connection');
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Cleanup interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });
}

export function broadcastMeetingUpdate(type: 'create' | 'update' | 'delete' | 'notes', meetingId: number) {
  if (!wss) return;

  const message = JSON.stringify({
    type: `meeting:${type}`,
    meetingId
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error broadcasting MeetMate meeting update:', error);
      }
    }
  });
}