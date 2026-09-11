/**
 * Centralized configuration — reads from environment variables.
 * Every value has a default so the app boots even with a minimal .env.
 */

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  appBaseUrl: string;
  adminBaseUrl: string;
  defaultLocale: string;
  supportedLocales: string[];

  databaseUrl: string;
  redisUrl: string;

  jwtAccessSecret: string;
  jwtAccessTtl: number;
  jwtRefreshSecret: string;
  jwtRefreshTtl: number;
  bcryptCost: number;
  totpIssuer: string;

  mailHost: string;
  mailPort: number;
  mailFrom: string;
  mailUiUrl: string;

  isProduction: boolean;
  isDevelopment: boolean;
}

export default (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  return {
    nodeEnv,
    port: Number(process.env.API_PORT ?? 4000),
    apiPrefix: process.env.API_GLOBAL_PREFIX ?? 'api/v1',
    appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    adminBaseUrl: process.env.ADMIN_BASE_URL ?? 'http://localhost:3001',
    defaultLocale: process.env.DEFAULT_LOCALE ?? 'bn',
    supportedLocales: (process.env.SUPPORTED_LOCALES ?? 'bn,en').split(','),

    databaseUrl: process.env.DATABASE_URL ?? '',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-CHANGE-ME',
    jwtAccessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-CHANGE-ME',
    jwtRefreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2592000),
    bcryptCost: Number(process.env.BCRYPT_COST ?? 12),
    totpIssuer: process.env.TOTP_ISSUER ?? 'Ecommarce',

    mailHost: process.env.MAIL_HOST ?? 'localhost',
    mailPort: Number(process.env.MAIL_PORT ?? 1025),
    mailFrom: process.env.MAIL_FROM ?? 'noreply@bluegofer.local',
    mailUiUrl: process.env.MAIL_UI_URL ?? 'http://localhost:8025',

    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
  };
};