import { MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { UserBlock } from '../entities/user-block.entity';
import { UserReport } from '../entities/user-report.entity';
import { ChatThread } from '../entities/chat-thread.entity';
import { User } from '../entities/user.entity';
import { AppError } from '../middleware/error-handler';
import { auditService } from './audit.service';
import { AuditAction } from '../types/enums';

const NEW_ACCOUNT_DAYS = 7;
const MAX_THREADS_PER_DAY = 5;

export class TrustService {
  private blockRepo = AppDataSource.getRepository(UserBlock);
  private reportRepo = AppDataSource.getRepository(UserReport);
  private threadRepo = AppDataSource.getRepository(ChatThread);
  private userRepo = AppDataSource.getRepository(User);

  private isNewAccount(user: User) {
    if (!user.kycVerifiedAt) return true;
    const days =
      (Date.now() - user.kycVerifiedAt.getTime()) / (1000 * 60 * 60 * 24);
    return days < NEW_ACCOUNT_DAYS;
  }

  private startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async assertCanPublish(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    if (!user.emailVerified || !user.kycVerified || !user.phoneVerified) {
      throw new AppError(
        403,
        'Verifica correo, celular e identidad para publicar',
        'NOT_VERIFIED',
      );
    }
  }

  async assertCanOpenChat(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    if (!this.isNewAccount(user)) return;

    const count = await this.threadRepo.count({
      where: {
        tenantId: userId,
        createdAt: MoreThanOrEqual(this.startOfToday()),
      },
    });
    if (count >= MAX_THREADS_PER_DAY) {
      throw new AppError(
        429,
        `Máximo ${MAX_THREADS_PER_DAY} chats nuevos por día`,
        'RATE_LIMIT',
      );
    }
  }

  async assertNotBlocked(userA: string, userB: string) {
    const block = await this.blockRepo.findOne({
      where: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    });
    if (block) {
      throw new AppError(403, 'Contacto bloqueado', 'BLOCKED');
    }
  }

  async reportUser(
    reporterId: string,
    reportedId: string,
    reason: string,
    threadId?: string,
    details?: string,
  ) {
    const report = this.reportRepo.create({
      reporterId,
      reportedId,
      reason,
      threadId,
      details,
    });
    await this.reportRepo.save(report);
    await auditService.log(reporterId, AuditAction.USER_REPORTED, 'user', reportedId, {
      reason,
      threadId,
    });
    return { reported: true };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new AppError(400, 'No puedes bloquearte a ti mismo', 'INVALID');
    }
    const existing = await this.blockRepo.findOne({
      where: { blockerId, blockedId },
    });
    if (!existing) {
      await this.blockRepo.save(
        this.blockRepo.create({ blockerId, blockedId }),
      );
    }
    await auditService.log(blockerId, AuditAction.USER_BLOCKED, 'user', blockedId);
    return { blocked: true };
  }
}

export const trustService = new TrustService();
