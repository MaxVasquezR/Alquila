import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ChatThreadStatus, DealStatus } from '../types/enums';
import { Product } from './product.entity';
import { User } from './user.entity';
import { ChatMessage } from './chat-message.entity';
import { DealCheckpoint } from './deal-checkpoint.entity';

@Entity('chat_threads')
export class ChatThread {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.chatThreads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.ownedThreads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => User, (user) => user.tenantThreads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: ChatThreadStatus.OPEN,
  })
  status!: ChatThreadStatus;

  @Column({ name: 'owner_accepted_contact', default: false })
  ownerAcceptedContact!: boolean;

  @Column({ name: 'tenant_questionnaire_completed', default: false })
  tenantQuestionnaireCompleted!: boolean;

  @Column({
    name: 'deal_status',
    type: 'varchar',
    length: 20,
    default: DealStatus.INTERESTED,
  })
  dealStatus!: DealStatus;

  @Column({
    name: 'agreed_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  agreedPrice?: string;

  @Column({ name: 'location_shared_at', type: 'datetime', nullable: true })
  locationSharedAt?: Date;

  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt?: Date;

  @OneToMany(() => ChatMessage, (message) => message.thread)
  messages!: ChatMessage[];

  @OneToMany(() => DealCheckpoint, (checkpoint) => checkpoint.thread)
  checkpoints!: DealCheckpoint[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
