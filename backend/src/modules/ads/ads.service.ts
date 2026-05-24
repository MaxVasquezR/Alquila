import { AppDataSource } from '../../config/data-source';
import { Ad } from '../../entities/ad.entity';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../types/enums';
import { toProductPublicDto } from '../products/product.public-mapper';

export class AdsService {
  private adRepo = AppDataSource.getRepository(Ad);
  private productRepo = AppDataSource.getRepository(Product);

  async getFeatured() {
    const now = new Date();
    const ads = await this.adRepo
      .createQueryBuilder('ad')
      .innerJoinAndSelect('ad.product', 'product')
      .innerJoinAndSelect('product.owner', 'owner')
      .where('ad.isActive = true')
      .andWhere('ad.startsAt <= :now', { now })
      .andWhere('ad.endsAt >= :now', { now })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .orderBy('ad.startsAt', 'DESC')
      .getMany();

    return {
      data: ads.map((ad) =>
        toProductPublicDto(ad.product, { isFeatured: true }),
      ),
    };
  }
}
