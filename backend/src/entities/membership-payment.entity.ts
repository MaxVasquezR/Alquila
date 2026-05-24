import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  MembershipPlan,
  PaymentProvider,
  PaymentStatus,
} from '../types/enums';
import { User } from './user.entity';

@Entity('membership_payments')
export class MembershipPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.membershipPayments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 20 })
  plan!: MembershipPlan;

  @Column({ name: 'amount_pen', type: 'decimal', precision: 10, scale: 2 })
  amountPen!: string;

  @Column({ type: 'varchar', length: 20 })
  provider!: PaymentProvider;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ name: 'external_id', nullable: true })
  externalId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
