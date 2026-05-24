import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('user_reports')
export class UserReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reporter_id' })
  reporterId!: string;

  @Column({ name: 'reported_id' })
  reportedId!: string;

  @Column({ name: 'thread_id', nullable: true })
  threadId?: string;

  @Column()
  reason!: string;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
