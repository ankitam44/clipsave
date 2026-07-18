// Simple mock backend for local testing.
// Run with: node mock-backend.js
// Then set EXPO_PUBLIC_BACKEND_URL=http://YOUR_PC_IP:3001 in .env
const http = require('http');

const CATEGORIES = ['Design', 'Marketing', 'Dev', 'Business', 'Health', 'Finance'];
const PLATFORMS = { youtube: 'youtube', instagram: 'instagram', tiktok: 'tiktok' };

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'youtube';
}

function mockResponse(url) {
  const platform = detectPlatform(url);
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  return {
    platform,
    summary: `Mock summary for ${url.slice(0, 60)}... This is a placeholder so you can test the full swipe deck flow without a real backend.`,
    keyTakeaways: [
      'This is a mock key takeaway — replace with real AI output',
      'The app is working end-to-end on your device',
      'Swap EXPO_PUBLIC_BACKEND_URL for your real backend when ready',
    ],
    todos: [
      { text: 'Watch this all the way through', done: false },
      { text: 'Take notes on the main idea', done: false },
      { text: 'Apply one thing you learned this week', done: false },
    ],
    toolsMentioned: [],
    category,
    transcriptAvailable: platform === 'youtube',
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/process-link') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { url } = JSON.parse(body);
        console.log(`[mock] processing: ${url}`);
        // Simulate a 1-2 second processing delay
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mockResponse(url)));
        }, 1000 + Math.random() * 1000);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'bad request' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(3001, '0.0.0.0', () => {
  console.log('');
  console.log('  Mock backend running on http://0.0.0.0:3001');
  console.log('');
  console.log('  Find your PC IP address with:');
  console.log('    ipconfig   (Windows)');
  console.log('');
  console.log('  Then set in .env:');
  console.log('    EXPO_PUBLIC_BACKEND_URL=http://<YOUR_IP>:3001');
  console.log('');
});
