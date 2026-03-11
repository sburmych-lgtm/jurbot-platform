import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { apiRouter } from './routes/index.js';
import { initBots, registerWebhooks } from './lib/telegram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Global rate limiting: 100 req/min per IP
app.use('/api', globalLimiter);

// Initialize Telegram bots (before routes so handlers are ready)
initBots();

app.use('/api', apiRouter);

// Serve Mini App static files in production (only if dist exists)
if (config.nodeEnv === 'production') {
  const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
  const indexHtml = path.join(webDist, 'index.html');

  if (existsSync(indexHtml)) {
    app.use(express.static(webDist));
    // SPA fallback: serve index.html for non-API routes
    app.get('{*path}', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(indexHtml);
    });
    console.log(`[Backend] Serving Mini App from ${webDist}`);
  } else {
    console.warn(`[Backend] Web dist not found at ${webDist} — skipping static serving`);
  }
}

app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`[Backend] Server running on port ${config.port}`);
  console.log(`[Backend] Environment: ${config.nodeEnv}`);

  // Register Telegram webhooks after server is listening
  registerWebhooks().catch((err) => {
    console.error('[Backend] Failed to register Telegram webhooks:', err);
  });
});

process.on('SIGTERM', () => {
  console.log('[Backend] SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Backend] Uncaught Exception:', err);
});

export { app };
