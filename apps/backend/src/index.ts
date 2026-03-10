import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { initBots, registerWebhooks } from './lib/telegram.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Initialize Telegram bots (before routes so handlers are ready)
initBots();

app.use('/api', apiRouter);

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

export { app };
