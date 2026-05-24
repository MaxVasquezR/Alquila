import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { NotificationType } from '../types/enums';
import { User } from './user.entity';

@Entity('notifications')
@Index(['userId', 'read', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 40 })
  type!: NotificationType;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'link_type', type: 'varchar', length: 30, nullable: true })
  linkType?: string;

  @Column({ name: 'link_id', nullable: true })
  linkId?: string;

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
