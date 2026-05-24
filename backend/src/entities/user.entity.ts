import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole, MembershipTier, KycStatus } from '../types/enums';
import { Product } from './product.entity';
import { ChatThread } from './chat-thread.entity';
import { ChatMessage } from './chat-message.entity';
import { RentalRequest } from './rental-request.entity';
import { MembershipPayment } from './membership-payment.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'display_name' })
  displayName!: string;

  /** Nunca exponer en APIs públicas */
  @Column({ name: 'phone_encrypted', nullable: true })
  phoneEncrypted?: string;

  @Column({ name: 'phone_hash', nullable: true, unique: true })
  phoneHash?: string;

  @Column({ name: 'legal_name_encrypted', nullable: true })
  legalNameEncrypted?: string;

  @Column({ name: 'social_links_encrypted', type: 'text', nullable: true })
  socialLinksEncrypted?: string;

  @Column({ type: 'varchar', length: 20, default: UserRole.BOTH })
  role!: UserRole;

  @Column({ name: 'kyc_verified', default: false })
  kycVerified!: boolean;

  @Column({
    name: 'kyc_status',
    type: 'varchar',
    length: 20,
    default: KycStatus.NONE,
  })
  kycStatus!: KycStatus;

  @Column({ name: 'kyc_provider', nullable: true })
  kycProvider?: string;

  @Column({ name: 'kyc_external_id', nullable: true })
  kycExternalId?: string;

  @Column({ name: 'dni_hash', nullable: true, unique: true })
  dniHash?: string;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified!: boolean;

  @Column({ name: 'kyc_verified_at', type: 'datetime', nullable: true })
  kycVerifiedAt?: Date;

  @Column({
    name: 'membership_tier',
    type: 'varchar',
    length: 20,
    default: MembershipTier.FREE,
  })
  membershipTier!: MembershipTier;

  @Column({ name: 'membership_expires_at', type: 'datetime', nullable: true })
  membershipExpiresAt?: Date;

  @Column({ name: 'requires_questionnaire', default: true })
  requiresQuestionnaire!: boolean;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'accepted_terms_at', type: 'datetime', nullable: true })
  acceptedTermsAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Product, (product) => product.owner)
  products!: Product[];

  @OneToMany(() => ChatThread, (thread) => thread.owner)
  ownedThreads!: ChatThread[];

  @OneToMany(() => ChatThread, (thread) => thread.tenant)
  tenantThreads!: ChatThread[];

  @OneToMany(() => ChatMessage, (message) => message.sender)
  messages!: ChatMessage[];

  @OneToMany(() => RentalRequest, (request) => request.tenant)
  rentalRequests!: RentalRequest[];

  @OneToMany(() => MembershipPayment, (payment) => payment.user)
  membershipPayments!: MembershipPayment[];
}
