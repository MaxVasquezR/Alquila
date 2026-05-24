import { AppDataSource } from '../../config/data-source';
import { RentalRequest } from '../../entities/rental-request.entity';
import { Product } from '../../entities/product.entity';
import { RentalRequestStatus, ProductStatus, NotificationType } from '../../types/enums';
import { User } from '../../entities/user.entity';
import { notificationService } from '../../services/notification.service';
import { CreateRentalRequestInput } from './rental-requests.schemas';

export class RentalRequestsService {
  private repo = AppDataSource.getRepository(RentalRequest);
  private productRepo = AppDataSource.getRepository(Product);

  async create(tenantId: string, input: CreateRentalRequestInput) {
    const tenant = await AppDataSource.getRepository(User).findOne({
      where: { id: tenantId },
    });

    const request = this.repo.create({
      tenantId,
      title: input.title,
      description: input.description,
      category: input.category,
      district: input.district,
      neededBy: new Date(input.neededBy),
      status: RentalRequestStatus.OPEN,
    });
    await this.repo.save(request);

    const owners = await this.productRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.ownerId', 'ownerId')
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p.district = :district', { district: input.district })
      .andWhere('p.ownerId != :tenantId', { tenantId })
      .getRawMany<{ ownerId: string }>();

    const neededDate = new Date(input.neededBy).toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
    });

    await Promise.all(
      owners.map((o) =>
        notificationService.notify(o.ownerId, {
          type: NotificationType.RENTAL_REQUEST,
          title: '¡Buscan en tu zona!',
          body: `${tenant?.displayName ?? 'Alguien'}: "${input.title}" en ${input.district} — ${neededDate}`,
          linkType: 'rental_request',
          linkId: request.id,
        }),
      ),
    );

    return request;
  }

  async listOpen(district?: string) {
    const qb = this.repo
      .createQueryBuilder('request')
      .innerJoin('request.tenant', 'tenant')
      .addSelect([
        'tenant.id',
        'tenant.displayName',
        'tenant.kycVerified',
        'tenant.membershipTier',
      ])
      .where('request.status = :status', {
        status: RentalRequestStatus.OPEN,
      });

    if (district) {
      qb.andWhere('request.district = :district', { district });
    }

    return qb.orderBy('request.createdAt', 'DESC').getMany();
  }
}
