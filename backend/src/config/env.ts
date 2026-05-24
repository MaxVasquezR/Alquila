import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const dbDriver = (process.env.DB_DRIVER ?? 'sqlite') as 'sqlite' | 'postgres';

export const env = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dbDriver,
  databaseUrl:
    process.env.DATABASE_URL ??
    (dbDriver === 'sqlite' ? 'data/alquila.sqlite' : undefined),
  sqlitePath: process.env.SQLITE_PATH ?? 'data/alquila.sqlite',
  jwtSecret: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  locationFuzzRadiusMeters: parseInt(
    process.env.LOCATION_FUZZ_RADIUS_METERS ?? '500',
    10,
  ),
  encryptionKey: requireEnv(
    'ENCRYPTION_KEY',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  ),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  freeProductLimit: 5,
  listingFeePen: parseFloat(process.env.LISTING_FEE_PEN ?? '3.00'),
  firstListingFree: process.env.FIRST_LISTING_FREE !== 'false',
  kycWebhookSecret: process.env.KYC_WEBHOOK_SECRET ?? 'dev-kyc-secret',
  yapePlinQrPayload:
    process.env.YAPE_PLIN_QR_PAYLOAD ??
    '00020101021243650016COM.YAPE.WALLET52045YAPE53033605403.005802PE5913ALQUILA EXPRESS6007LIMA  6304ABCD',
};

if (env.dbDriver === 'postgres' && !env.databaseUrl) {
  throw new Error('DATABASE_URL is required when DB_DRIVER=postgres');
}
