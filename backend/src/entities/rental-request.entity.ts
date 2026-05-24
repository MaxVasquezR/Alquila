import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RentalRequestStatus } from '../types/enums';
import { User } from './user.entity';

@Entity('rental_requests')
@Index(['district', 'status'])
export class RentalRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => User, (user) => user.rentalRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: User;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  category!: string;

  @Column()
  district!: string;

  @Column({ name: 'needed_by', type: 'datetime' })
  neededBy!: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: RentalRequestStatus.OPEN,
  })
  status!: RentalRequestStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
