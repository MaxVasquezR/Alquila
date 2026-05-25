import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { DealCheckpointStage } from '../types/enums';
import { ChatThread } from './chat-thread.entity';
import { User } from './user.entity';
import { DealCheckpointPhoto } from './deal-checkpoint-photo.entity';

@Entity('deal_checkpoints')
export class DealCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'thread_id' })
  threadId!: string;

  @ManyToOne(() => ChatThread, (thread) => thread.checkpoints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thread_id' })
  thread!: ChatThread;

  @Column({ name: 'submitted_by_id' })
  submittedById!: string;

  @ManyToOne(() => User, (user) => user.dealCheckpoints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy!: User;

  @Column({ type: 'varchar', length: 20 })
  stage!: DealCheckpointStage;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => DealCheckpointPhoto, (photo) => photo.checkpoint)
  photos!: DealCheckpointPhoto[];
}
