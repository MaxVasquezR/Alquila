import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { KycStatus } from '../../types/enums';
import { encrypt } from '../../utils/encryption';
import { hashDni } from '../../utils/identity';
import { AppError } from '../../middleware/error-handler';
import { auditService } from '../../services/audit.service';
import { AuditAction } from '../../types/enums';
import { env } from '../../config/env';

export interface KycProviderAdapter {
  createSession(userId: string): Promise<{ sessionId: string; sessionUrl: string }>;
}

/** Simula Didit/Verifik/MetaMap en desarrollo */
class MockKycProvider implements KycProviderAdapter {
  async createSession(userId: string) {
    const sessionId = `kyc_${userId}_${Date.now()}`;
    return {
      sessionId,
      sessionUrl: `/verificar?session=${sessionId}`,
    };
  }
}

export class KycService {
  private userRepo = AppDataSource.getRepository(User);
  private provider: KycProviderAdapter = new MockKycProvider();

  async getStatus(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    return {
      kycStatus: user.kycStatus,
      kycVerified: user.kycVerified,
      kycVerifiedAt: user.kycVerifiedAt,
      phoneVerified: user.phoneVerified,
      avatarUrl: user.avatarUrl,
      canPublish: user.kycVerified && user.phoneVerified,
    };
  }

  async startSession(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    if (!user.phoneVerified) {
      throw new AppError(403, 'Verifica tu celular primero', 'PHONE_NOT_VERIFIED');
    }
    if (user.kycStatus === KycStatus.APPROVED) {
      return { alreadyVerified: true, ...await this.getStatus(userId) };
    }

    const session = await this.provider.createSession(userId);
    user.kycStatus = KycStatus.PENDING;
    user.kycProvider = 'MOCK';
    user.kycExternalId = session.sessionId;
    await this.userRepo.save(user);

    await auditService.log(userId, AuditAction.KYC_STARTED, 'user', userId, {
      sessionId: session.sessionId,
    });

    return {
      sessionId: session.sessionId,
      sessionUrl: session.sessionUrl,
      kycStatus: user.kycStatus,
    };
  }

  /** Simula callback del proveedor KYC (dev) o webhook interno */
  async completeVerification(
    userId: string,
    payload: {
      dni: string;
      legalName: string;
      avatarUrl?: string;
      approved?: boolean;
    },
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    const approved = payload.approved !== false;
    if (!approved) {
      user.kycStatus = KycStatus.REJECTED;
      user.kycVerified = false;
      await this.userRepo.save(user);
      await auditService.log(userId, AuditAction.KYC_REJECTED, 'user', userId);
      return { kycStatus: user.kycStatus, kycVerified: false };
    }

    const dniHash = hashDni(payload.dni);
    const duplicate = await this.userRepo.findOne({ where: { dniHash } });
    if (duplicate && duplicate.id !== userId) {
      throw new AppError(409, 'Este DNI ya está registrado', 'DNI_EXISTS');
    }

    user.dniHash = dniHash;
    user.legalNameEncrypted = encrypt(payload.legalName);
    user.kycStatus = KycStatus.APPROVED;
    user.kycVerified = true;
    user.kycVerifiedAt = new Date();
    if (payload.avatarUrl) user.avatarUrl = payload.avatarUrl;
    await this.userRepo.save(user);

    await auditService.log(userId, AuditAction.KYC_APPROVED, 'user', userId);

    return {
      kycStatus: user.kycStatus,
      kycVerified: true,
      avatarUrl: user.avatarUrl,
    };
  }

  async handleWebhook(body: {
    sessionId: string;
    status: string;
    dni?: string;
    legalName?: string;
    avatarUrl?: string;
  }) {
    const user = await this.userRepo.findOne({
      where: { kycExternalId: body.sessionId },
    });
    if (!user) throw new AppError(404, 'Session not found', 'NOT_FOUND');

    if (body.status === 'approved' && body.dni && body.legalName) {
      return this.completeVerification(user.id, {
        dni: body.dni,
        legalName: body.legalName,
        avatarUrl: body.avatarUrl,
        approved: true,
      });
    }

    user.kycStatus = KycStatus.REJECTED;
    user.kycVerified = false;
    await this.userRepo.save(user);
    await auditService.log(user.id, AuditAction.KYC_REJECTED, 'user', user.id);
    return { kycStatus: user.kycStatus };
  }

  verifyWebhookSecret(header?: string) {
    if (env.nodeEnv === 'development') return true;
    return header === env.kycWebhookSecret;
  }
}

export const kycService = new KycService();
