/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { runClinicCommand, runClinicAdvice } from './api/_lib/geminiCommand';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON body
app.use(express.json({ limit: '2mb' }));

// Allow Firebase Google Auth popup window.opener communication across browsers
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// AI Command Execution Endpoint (Gemini Function Calling with retry & fallback)
app.post('/api/gemini/command', async (req, res) => {
  const result = await runClinicCommand(req.body || {});
  return res.status(result.status).json(result.payload);
});

// Strategic Advice Endpoint
app.post('/api/gemini/advice', async (req, res) => {
  const result = await runClinicAdvice(req.body || {});
  return res.status(result.status).json(result.payload);
});

// Setup Vite or static serving
async function setupViteAndListen() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve client router fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Clinica] Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

setupViteAndListen().catch(err => {
  console.error('Failed to start server:', err);
});
