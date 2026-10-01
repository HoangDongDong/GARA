const express = require('express');
const router = express.Router();
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const OCR_PORT = 5050;
let ocrProcess = null;

// Tự động khởi động OCR service nếu chưa có
function ensureOcrService() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${OCR_PORT}/api/ocr/health`, { timeout: 1000 }, (res) => {
      if (res.statusCode === 200) return resolve(true);
      resolve(false);
    });
    req.on('error', () => {
      // Chưa chạy -> tự động spawn ngầm
      if (!ocrProcess) {
        console.log('[Backend] Auto-starting Python OCR Service on port 5050...');
        const fs = require('fs');
        const internalDir = path.resolve(__dirname, '../../../ocr-service');
        const serviceDir = fs.existsSync(internalDir) ? internalDir : path.resolve(__dirname, '../../../../plate_ocr_service');
        ocrProcess = spawn('python', ['app.py'], {
          cwd: serviceDir,
          stdio: 'ignore',
          detached: true,
          shell: true,
        });
        ocrProcess.unref();
      }
      resolve(false);
    });
  });
}

// Health check
router.get('/health', async (req, res) => {
  const isRunning = await ensureOcrService();
  res.json({ ok: true, ocrServiceRunning: isRunning, port: OCR_PORT });
});

// Proxy scan biển số (Base64)
router.post('/scan-plate', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Missing image' });
  }

  try {
    const postData = JSON.stringify({ image });
    const clientReq = http.request(
      {
        hostname: 'localhost',
        port: OCR_PORT,
        path: '/api/ocr/plate-base64',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 15000,
      },
      (clientRes) => {
        let raw = '';
        clientRes.on('data', (chunk) => (raw += chunk));
        clientRes.on('end', () => {
          try {
            res.status(clientRes.statusCode).json(JSON.parse(raw));
          } catch {
            res.status(500).json({ error: 'Invalid OCR response' });
          }
        });
      }
    );

    clientReq.on('error', (err) => {
      res.status(503).json({ error: 'OCR service unavailable: ' + err.message });
    });

    clientReq.write(postData);
    clientReq.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.ensureOcrService = ensureOcrService;
