import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api', healthRouter);

app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`[Backend] Server running on port ${config.port}`);
  console.log(`[Backend] Environment: ${config.nodeEnv}`);
});

process.on('SIGTERM', () => {
  console.log('[Backend] SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

export { app };
