import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AdPlacement } from '../types/enums';
import { Product } from './product.entity';

@Entity('ads')
@Index(['isActive', 'placement', 'startsAt', 'endsAt'])
export class Ad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.ads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'starts_at', type: 'datetime' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'datetime' })
  endsAt!: Date;

  @Column({ type: 'varchar', length: 30, default: AdPlacement.HOME_FEED })
  placement!: AdPlacement;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
