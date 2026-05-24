import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { PhoneOtp } from '../../entities/phone-otp.entity';
import { AppError } from '../../middleware/error-handler';
import { encrypt } from '../../utils/encryption';
import { generateOtpCode, hashDni } from '../../utils/identity';
import { auditService } from '../../services/audit.service';
import { AuditAction } from '../../types/enums';

const OTP_TTL_MS = 10 * 60 * 1000;

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

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.otpRepo.save(
      this.otpRepo.create({ phone: normalized, code, expiresAt, used: false }),
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
      where: { phone: normalized, code, used: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt < new Date()) {
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

    await auditService.log(userId, AuditAction.OTP_VERIFIED, 'user', userId);

    return { phoneVerified: true };
  }
}

export const otpService = new OtpService();
