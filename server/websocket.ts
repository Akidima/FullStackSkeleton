import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });
}

export function broadcastMeetingUpdate(type: 'create' | 'update' | 'delete', meetingId: number) {
  if (!wss) return;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: `meeting:${type}`,
        meetingId
      }));
    }
  });
}
