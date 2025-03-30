import WebSocket from 'ws';

// Create a WebSocket client
const ws = new WebSocket('ws://localhost:5000/ws');

// Connection opened event
ws.on('open', function open() {
  console.log('Connected to WebSocket server');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'test',
    message: 'Hello from WebSocket test client',
    timestamp: new Date().toISOString()
  }));
});

// Listen for messages
ws.on('message', function incoming(data) {
  console.log('Received message:', data.toString());
});

// Error event
ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

// Close event
ws.on('close', function close() {
  console.log('Connection closed');
});

// Set a timeout to close the connection after some time
setTimeout(() => {
  ws.close();
  console.log('Test complete, connection closed');
  process.exit(0);
}, 10000); // 10 seconds