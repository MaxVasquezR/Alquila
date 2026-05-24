import crypto from 'crypto';
import { env } from '../config/env';

export function hashDni(dni: string): string {
  return crypto
    .createHash('sha256')
    .update(`${dni.trim()}::${env.encryptionKey.slice(0, 16)}`)
    .digest('hex');
}

export function generateOtpCode(): string {
  if (env.nodeEnv === 'development') {
    return '123456';
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}
