const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Validate Gemini API key at startup
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
if (GEMINI_KEY) {
  console.log(`✅ Gemini API Key loaded (${GEMINI_KEY.substring(0, 8)}...)`);
} else {
  console.warn('⚠️  No GEMINI_API_KEY found in .env — AI features will use client-provided key or offline fallback.');
}

// Enable JSON middleware for Gemini API secure proxying
app.use(express.json());

// Serve static assets
app.use(express.static(path.join(__dirname)));

// Secure Gemini API Proxy endpoint
app.post('/api/gemini', async (req, res) => {

  const { prompt } = req.body;
  // Server env key takes priority; client-sent key is fallback for local dev
  const apiKey = GEMINI_KEY || req.headers['x-gemini-key'];

  if (!apiKey) {
    return res.status(400).json({ error: "Gemini API Key missing. Configure it on the server or client." });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini response failed: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    res.json({ text });
  } catch (err) {
    console.error("Gemini Proxy Error:", err);
    res.status(500).json({ error: "Failed to communicate with Gemini API." });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server for real-time fan chat & synchronized score feeds
const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`New fan connected. Total fans: ${clients.size}`);

  // Send welcome packet
  ws.send(JSON.stringify({
    type: 'system',
    text: 'Welcome to CricFit Arena fan chat! Connect with other athletes & fans live.'
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Broadcast received chat message to all connected clients
      if (data.type === 'chat') {
        const payload = JSON.stringify({
          type: 'chat',
          user: data.user || 'AnonFan',
          text: data.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        broadcast(payload);
      }
    } catch (e) {
      console.error("Failed to parse websocket message", e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Fan disconnected. Total remaining: ${clients.size}`);
  });
});

function broadcast(payload) {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Periodic live IPL commentary injector (Webscraped or simulated data)
setInterval(() => {
  // If we have clients, broadcast occasional match event alerts
  if (clients.size > 0) {
    const events = ['SIX ALERT!', 'WICKET ALERT!', 'FOUR ALERT!'];
    const selected = events[Math.floor(Math.random() * events.length)];
    broadcast(JSON.stringify({
      type: 'match_alert',
      event: selected,
      timestamp: new Date().toLocaleTimeString()
    }));
  }
}, 30000); // Send every 30 seconds

server.listen(port, () => {
  console.log(`====================================================`);
  console.log(`🏏 CricFit Arena server running at http://localhost:${port}`);
  console.log(`====================================================`);
});
