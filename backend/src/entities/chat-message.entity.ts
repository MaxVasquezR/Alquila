import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatMessageType } from '../types/enums';
import { ChatThread } from './chat-thread.entity';
import { User } from './user.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'thread_id' })
  threadId!: string;

  @ManyToOne(() => ChatThread, (thread) => thread.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'thread_id' })
  thread!: ChatThread;

  @Column({ name: 'sender_id' })
  senderId!: string;

  @ManyToOne(() => User, (user) => user.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender!: User;

  @Column({ type: 'text' })
  content!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: ChatMessageType.TEXT,
  })
  type!: ChatMessageType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
