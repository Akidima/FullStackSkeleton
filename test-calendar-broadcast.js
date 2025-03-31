import { WebSocket } from 'ws';
import http from 'http';
// We'll call the broadcast function through the API endpoint, not directly

// Create a WebSocket client to receive the broadcast
const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', function open() {
  console.log('Connected to WebSocket server');
  
  // Wait a moment before testing the broadcast
  setTimeout(() => {
    try {
      console.log('Testing calendar broadcast function...');
      
      // Use the built-in http module to send a POST request to our API endpoint
      // http is already imported at the top
      
      const data = JSON.stringify({
        type: 'sync', // Just the type without the 'calendar:' prefix
        userId: 1,
        meetingId: 123,
        provider: 'google'
      });
      
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/test/websocket/calendar',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };
      
      const req = http.request(options, (res) => {
        console.log(`Status Code: ${res.statusCode}`);
        
        res.on('data', (chunk) => {
          console.log(`Response: ${chunk}`);
        });
      });
      
      req.on('error', (error) => {
        console.error('Error sending HTTP request:', error);
      });
      
      req.write(data);
      req.end();
      
      console.log('Calendar broadcast sent');
    } catch (error) {
      console.error('Error broadcasting calendar update:', error);
    }
  }, 1000);
});

ws.on('message', function incoming(data) {
  try {
    const message = JSON.parse(data.toString());
    
    console.log('Received message type:', message.type);
    
    // Log calendar-related messages in detail
    if (message.type && message.type.startsWith('calendar:')) {
      console.log('🗓️ CALENDAR EVENT RECEIVED:', message);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('Connection closed');
});

// Close the connection after some time
setTimeout(() => {
  ws.close();
  console.log('Test complete, connection closed');
}, 10000); // 10 seconds