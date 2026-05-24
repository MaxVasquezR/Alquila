import { AppDataSource } from '../config/data-source';
import { PrivacyAuditLog } from '../entities/privacy-audit-log.entity';
import { AuditAction } from '../types/enums';

export class AuditService {
  private repo = AppDataSource.getRepository(PrivacyAuditLog);

  async log(
    userId: string,
    action: AuditAction | string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ) {
    const entry = this.repo.create({
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
    });
    await this.repo.save(entry);
  }
}

export const auditService = new AuditService();
