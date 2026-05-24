import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('phone_otps')
export class PhoneOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  phone!: string;

  @Column()
  code!: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @Column({ default: false })
  used!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
