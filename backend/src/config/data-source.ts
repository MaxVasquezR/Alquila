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

const entities = [
  User,
  Product,
  Ad,
  ChatThread,
  ChatMessage,
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
    migrations: ['src/migrations/*.ts'],
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
