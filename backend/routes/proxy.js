const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { URL } = require('url');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, timeout: 30000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, timeout: 30000 });

router.get('/fetch', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  
  try {
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const protocol = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;
    
    const proxyReq = protocol.request(parsedUrl, {
      method: 'GET',
      agent: agent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    }, (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || 'text/html';
      
      res.set({
        'Content-Type': contentType,
        'X-Proxy-Status': proxyRes.statusCode,
        'X-Final-URL': parsedUrl.href
      });
      
      proxyRes.on('error', (err) => {
        console.error('Proxy response error:', err);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Upstream error', details: err.message });
        } else {
          res.destroy();
        }
      });

      if (contentType.includes('text/html')) {
        let data = [];
        proxyRes.on('data', chunk => data.push(chunk));
        proxyRes.on('end', () => {
          const buffer = Buffer.concat(data);
          let html = buffer.toString('utf-8');
          const baseTag = `<base href="${parsedUrl.origin}/">`;
          html = html.replace(/<head>/i, `<head>${baseTag}`);
          res.send(html);
        });
      } else {
        proxyRes.pipe(res);
        proxyRes.on('end', () => res.end());
      }
    });
    
    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Proxy request failed', details: err.message });
      } else {
        res.destroy();
      }
    });
    
    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    });
    
    proxyReq.end();
  } catch (err) {
    res.status(500).json({ error: 'Invalid URL', details: err.message });
  }
});

module.exports = router;
