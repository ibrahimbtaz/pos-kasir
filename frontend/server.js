const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Check if SSL certificates exist
const certPath = path.join(__dirname, 'certs');
const keyFile = path.join(certPath, 'key.pem');
const certFile = path.join(certPath, 'cert.pem');

let httpsOptions = null;

if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  httpsOptions = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
  };
  console.log('✅ SSL certificates found, starting HTTPS server');
} else {
  console.log('⚠️ No SSL certificates found at', certPath);
  console.log('Starting HTTP server instead (camera may not work on mobile)');
}

app.prepare().then(() => {
  if (httpsOptions) {
    createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, hostname, () => {
      console.log(`> Ready on https://${hostname}:${port}`);
    });
  } else {
    // Fallback to HTTP
    const { createServer: createHttpServer } = require('http');
    createHttpServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  }
});
