import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { PhoneOtp } from '../../entities/phone-otp.entity';
import { AppError } from '../../middleware/error-handler';
import { encrypt } from '../../utils/encryption';
import { generateOtpCode, hashDni } from '../../utils/identity';
import { auditService } from '../../services/audit.service';
import { AuditAction } from '../../types/enums';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export class OtpService {
  private userRepo = AppDataSource.getRepository(User);
  private otpRepo = AppDataSource.getRepository(PhoneOtp);

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '').slice(-9);
  }

  async send(userId: string, phone: string) {
    const normalized = this.normalizePhone(phone);
    if (normalized.length !== 9) {
      throw new AppError(400, 'Celular inválido (9 dígitos)', 'INVALID_PHONE');
    }

    const phoneHash = hashDni(`phone:${normalized}`);
    const existing = await this.userRepo.findOne({ where: { phoneHash } });
    if (existing && existing.id !== userId && existing.phoneVerified) {
      throw new AppError(409, 'Celular ya registrado', 'PHONE_EXISTS');
    }

    const latestOtp = await this.otpRepo.findOne({
      where: { phone: normalized, used: false },
      order: { createdAt: 'DESC' },
    });
    if (
      latestOtp &&
      Date.now() - latestOtp.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS &&
      latestOtp.expiresAt > new Date()
    ) {
      throw new AppError(
        429,
        'Espera un minuto antes de pedir otro código',
        'OTP_RATE_LIMIT',
      );
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const codeHash = hashDni(`otp:${normalized}:${code}`);
    await this.otpRepo.update({ phone: normalized, used: false }, { used: true });
    await this.otpRepo.save(
      this.otpRepo.create({ phone: normalized, code: codeHash, expiresAt, used: false }),
    );

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.phoneEncrypted = encrypt(normalized);
      user.phoneHash = phoneHash;
      await this.userRepo.save(user);
    }

    return {
      sent: true,
      expiresAt,
      devCode: process.env.NODE_ENV === 'development' ? code : undefined,
    };
  }

  async verify(userId: string, phone: string, code: string) {
    const normalized = this.normalizePhone(phone);
    const otp = await this.otpRepo.findOne({
      where: { phone: normalized, used: false },
      order: { createdAt: 'DESC' },
    });

    const codeHash = hashDni(`otp:${normalized}:${code}`);
    if (!otp || otp.expiresAt < new Date() || otp.code !== codeHash) {
      throw new AppError(400, 'Código inválido o expirado', 'INVALID_OTP');
    }

    otp.used = true;
    await this.otpRepo.save(otp);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    user.phoneEncrypted = encrypt(normalized);
    user.phoneHash = hashDni(`phone:${normalized}`);
    user.phoneVerified = true;
    await this.userRepo.save(user);
    await this.otpRepo.update({ phone: normalized, used: false }, { used: true });

    await auditService.log(userId, AuditAction.OTP_VERIFIED, 'user', userId);

    return { phoneVerified: true };
  }
}

export const otpService = new OtpService();
