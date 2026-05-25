import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdPlan, PaymentProvider, PaymentStatus } from '../types/enums';
import { User } from './user.entity';
import { Product } from './product.entity';

@Entity('ad_payments')
export class AdPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'product_id' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'varchar', length: 30 })
  plan!: AdPlan;

  @Column({ name: 'amount_pen', type: 'decimal', precision: 10, scale: 2 })
  amountPen!: string;

  @Column({ type: 'varchar', length: 20 })
  provider!: PaymentProvider;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ name: 'external_id', nullable: true })
  externalId?: string;

  @Column({ name: 'qr_payload', type: 'text', nullable: true })
  qrPayload?: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
