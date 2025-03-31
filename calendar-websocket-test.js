import WebSocket from 'ws';
import pkg from 'node-fetch';
const { default: fetch } = pkg;

// Create a WebSocket client
const ws = new WebSocket('ws://localhost:5000/ws');

// Connection opened event
ws.on('open', function open() {
  console.log('Connected to WebSocket server for calendar testing');
  
  // Simulate a calendar sync using the broadcast function
  setTimeout(async () => {
    try {
      console.log('Testing calendar broadcast function...');
      
      // Make a request to test the calendar WebSocket broadcast function
      const response = await fetch('http://localhost:5000/api/websocket/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'calendar:sync',
          userId: 1,
          meetingId: 123,
          provider: 'google'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Calendar broadcast test response:', data);
      } else {
        console.error('Calendar broadcast test failed:', await response.text());
      }
    } catch (error) {
      console.error('Error testing calendar broadcast:', error);
    }
  }, 1000);
});

// Listen for messages
ws.on('message', function incoming(data) {
  const message = JSON.parse(data.toString());
  console.log('Received message type:', message.type);
  
  // If we receive a calendar-related message, log it prominently
  if (message.type && message.type.startsWith('calendar:')) {
    console.log('🗓️ CALENDAR EVENT RECEIVED:', message);
  } else {
    console.log('Other message received:', message);
  }
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
}, 15000); // 15 seconds