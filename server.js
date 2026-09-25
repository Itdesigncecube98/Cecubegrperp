const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

// Force the working directory to be the directory of server.js
process.chdir(__dirname);

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

console.log('Starting Next.js server from:', __dirname);
console.log('Environment:', process.env.NODE_ENV);

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on port ${port}`);
  });
}).catch(err => {
  console.error('Error starting Next.js:', err);
});
