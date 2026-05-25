import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function requireSecret(key: string, fallback: string): string {
  const value = requireEnv(key, fallback);
  if (isProduction && value === fallback) {
    throw new Error(`Unsafe default detected for ${key} in production`);
  }
  return value;
}

const dbDriver = (process.env.DB_DRIVER ?? 'sqlite') as 'sqlite' | 'postgres';
const corsOrigin = process.env.CORS_ORIGIN ?? (isProduction ? undefined : 'http://localhost:5173');

if (isProduction && (!corsOrigin || corsOrigin === '*')) {
  throw new Error('CORS_ORIGIN must be explicitly configured in production');
}

export const env = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv,
  isProduction,
  dbDriver,
  databaseUrl:
    process.env.DATABASE_URL ??
    (dbDriver === 'sqlite' ? 'data/alquila.sqlite' : undefined),
  sqlitePath: process.env.SQLITE_PATH ?? 'data/alquila.sqlite',
  jwtSecret: requireSecret('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  locationFuzzRadiusMeters: parseInt(
    process.env.LOCATION_FUZZ_RADIUS_METERS ?? '500',
    10,
  ),
  encryptionKey: requireSecret(
    'ENCRYPTION_KEY',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  ),
  corsOrigin: corsOrigin!,
  freeProductLimit: 5,
  listingFeePen: parseFloat(process.env.LISTING_FEE_PEN ?? '4.00'),
  firstListingFree: process.env.FIRST_LISTING_FREE !== 'false',
  firstListingWindowDays: parseInt(process.env.FIRST_LISTING_WINDOW_DAYS ?? '30', 10),
  listingDurationDays: parseInt(process.env.LISTING_DURATION_DAYS ?? '30', 10),
  superPromoFeePen: parseFloat(process.env.SUPER_PROMO_FEE_PEN ?? '14.00'),
  superPromoDurationDays: parseInt(process.env.SUPER_PROMO_DURATION_DAYS ?? '7', 10),
  maxProductImages: parseInt(process.env.MAX_PRODUCT_IMAGES ?? '3', 10),
  maxProductImageBytes: parseInt(process.env.MAX_PRODUCT_IMAGE_BYTES ?? `${4 * 1024 * 1024}`, 10),
  kycWebhookSecret: requireSecret('KYC_WEBHOOK_SECRET', 'dev-kyc-secret'),
  yapePlinQrPayload:
    process.env.YAPE_PLIN_QR_PAYLOAD ??
    '00020101021243650016COM.YAPE.WALLET52045YAPE53033605403.005802PE5913ALQUILA EXPRESS6007LIMA  6304ABCD',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL ?? `http://localhost:${parseInt(process.env.PORT ?? '3000', 10)}`,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  seedDemoData:
    process.env.SEED_DEMO_DATA === 'true' ||
    (!isProduction && process.env.SEED_DEMO_DATA !== 'false'),
  allowDevMocks: !isProduction,
};

if (env.dbDriver === 'postgres' && !env.databaseUrl) {
  throw new Error('DATABASE_URL is required when DB_DRIVER=postgres');
}
