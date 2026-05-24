import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { ChatThread } from '../../entities/chat-thread.entity';
import { DealStatus } from '../../types/enums';
import { encrypt } from '../../utils/encryption';
import { hashDni } from '../../utils/identity';
import { AppError } from '../../middleware/error-handler';
import { RegisterInput, LoginInput } from './auth.schemas';
import { auditService } from '../../services/audit.service';
import { AuditAction } from '../../types/enums';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

const SALT_ROUNDS = 12;

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);
  private threadRepo = AppDataSource.getRepository(ChatThread);

  async register(input: RegisterInput) {
    const existing = await this.userRepo.findOne({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    const normalizedPhone = input.phone.replace(/\D/g, '').slice(-9);
    const phoneHash = hashDni(`phone:${normalizedPhone}`);
    const phoneTaken = await this.userRepo.findOne({ where: { phoneHash } });
    if (phoneTaken) {
      throw new AppError(409, 'Celular ya registrado', 'PHONE_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = this.userRepo.create({
      email: input.email.toLowerCase(),
      passwordHash,
      displayName: input.displayName,
      phoneEncrypted: encrypt(normalizedPhone),
      phoneHash,
      role: input.role,
      acceptedTermsAt: new Date(),
      phoneVerified: false,
    });

    await this.userRepo.save(user);
    await auditService.log(user.id, AuditAction.REGISTER, 'user', user.id);
    return this.buildAuthResponse(user);
  }

  async login(input: LoginInput) {
    const user = await this.userRepo.findOne({
      where: { email: input.email.toLowerCase() },
    });
    if (!user) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    await auditService.log(user.id, AuditAction.LOGIN, 'user', user.id);
    return this.buildAuthResponse(user);
  }

  private async dealsClosedCount(userId: string) {
    const asOwner = await this.threadRepo.count({
      where: { ownerId: userId, dealStatus: DealStatus.CLOSED },
    });
    const asTenant = await this.threadRepo.count({
      where: { tenantId: userId, dealStatus: DealStatus.CLOSED },
    });
    return asOwner + asTenant;
  }

  private async buildAuthResponse(user: User) {
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        kycVerified: user.kycVerified,
        kycStatus: user.kycStatus,
        phoneVerified: user.phoneVerified,
        avatarUrl: user.avatarUrl,
        membershipTier: user.membershipTier,
        membershipExpiresAt: user.membershipExpiresAt,
        dealsClosedCount: await this.dealsClosedCount(user.id),
        canPublish: user.kycVerified && user.phoneVerified,
      },
    };
  }
}
