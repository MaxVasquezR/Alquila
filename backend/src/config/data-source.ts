import 'reflect-metadata';
import path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from './env';
import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';
import { Ad } from '../entities/ad.entity';
import { ChatThread } from '../entities/chat-thread.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { RentalRequest } from '../entities/rental-request.entity';
import { MembershipPayment } from '../entities/membership-payment.entity';
import { PrivacyAuditLog } from '../entities/privacy-audit-log.entity';
import { ListingPayment } from '../entities/listing-payment.entity';
import { PhoneOtp } from '../entities/phone-otp.entity';
import { UserReport } from '../entities/user-report.entity';
import { UserBlock } from '../entities/user-block.entity';
import { Notification } from '../entities/notification.entity';
import { ProductImage } from '../entities/product-image.entity';
import { AdPayment } from '../entities/ad-payment.entity';
import { DealCheckpoint } from '../entities/deal-checkpoint.entity';
import { DealCheckpointPhoto } from '../entities/deal-checkpoint-photo.entity';

const entities = [
  User,
  Product,
  ProductImage,
  Ad,
  AdPayment,
  ChatThread,
  ChatMessage,
  DealCheckpoint,
  DealCheckpointPhoto,
  RentalRequest,
  MembershipPayment,
  PrivacyAuditLog,
  Notification,
  ListingPayment,
  PhoneOtp,
  UserReport,
  UserBlock,
];

function buildOptions(): DataSourceOptions {
  const base = {
    synchronize: env.nodeEnv === 'development',
    logging: env.nodeEnv === 'development',
    entities,
    migrations:
      env.nodeEnv === 'development'
        ? ['src/migrations/*.ts']
        : ['dist/migrations/*.js'],
    subscribers: [] as never[],
  };

  if (env.dbDriver === 'postgres') {
    return {
      type: 'postgres',
      url: env.databaseUrl!,
      ...base,
    };
  }

  return {
    type: 'better-sqlite3',
    database: path.resolve(process.cwd(), env.sqlitePath),
    ...base,
  };
}

export const AppDataSource = new DataSource(buildOptions());
