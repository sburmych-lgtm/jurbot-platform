import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/jurbot'),
  JWT_SECRET: z.string().default('dev-jwt-secret-change-in-production'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-in-production'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().default('12'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  TELEGRAM_BOT_TOKEN_LAWYER: z.string().default('PLACEHOLDER_PROVIDE_LATER'),
  TELEGRAM_BOT_TOKEN_CLIENT: z.string().default('PLACEHOLDER_PROVIDE_LATER'),
  TELEGRAM_WEBHOOK_SECRET: z.string().default('dev-webhook-secret'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('10485760'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[Config] Invalid environment variables:', parsed.error.flatten().fieldErrors);
}
const env = parsed.success ? parsed.data : envSchema.parse({});

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  jwtAccessExpiry: env.JWT_ACCESS_EXPIRY,
  jwtRefreshExpiry: env.JWT_REFRESH_EXPIRY,
  bcryptRounds: parseInt(env.BCRYPT_ROUNDS, 10),
  frontendUrl: env.FRONTEND_URL,
  telegramLawyerToken: env.TELEGRAM_BOT_TOKEN_LAWYER,
  telegramClientToken: env.TELEGRAM_BOT_TOKEN_CLIENT,
  telegramWebhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
  uploadDir: env.UPLOAD_DIR,
  maxFileSize: parseInt(env.MAX_FILE_SIZE, 10),
} as const;
