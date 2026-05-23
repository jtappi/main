const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'tasks.json');
const PUBLIC_DIR = __dirname;

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  console.log('Created tasks.json');
}

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;

  if (req.method === 'GET' && req.url === '/api/tasks') {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(500);
      res.end('Error reading tasks');
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/tasks') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const count = Array.isArray(parsed)
          ? parsed.length
          : Array.isArray(parsed.tasks)
            ? parsed.tasks.length
            : 0;
        fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count }));
        console.log('[' + new Date().toLocaleTimeString() + '] Saved ' + count + ' active tasks');
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  const filePath = path.join(PUBLIC_DIR, url.split('?')[0]);
  const ext = path.extname(filePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + url);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✓ Task Manager running!');
  console.log('');
  console.log('  Open in your browser:');
  console.log('  → http://localhost:' + PORT);
  console.log('');
  console.log('  Tasks are saved to: tasks.json');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
