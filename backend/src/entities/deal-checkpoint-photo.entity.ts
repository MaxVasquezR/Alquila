import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DealCheckpoint } from './deal-checkpoint.entity';

@Entity('deal_checkpoint_photos')
export class DealCheckpointPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'checkpoint_id' })
  checkpointId!: string;

  @ManyToOne(() => DealCheckpoint, (checkpoint) => checkpoint.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'checkpoint_id' })
  checkpoint!: DealCheckpoint;

  @Column({ type: 'text' })
  url!: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
