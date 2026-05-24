import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductStatus } from '../types/enums';
import { User } from './user.entity';
import { Ad } from './ad.entity';
import { ChatThread } from './chat-thread.entity';

@Entity('products')
@Index(['district', 'status'])
@Index(['category', 'status'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'available_today', default: true })
  availableToday!: boolean;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  category!: string;

  @Column({ name: 'price_per_day', type: 'decimal', precision: 10, scale: 2 })
  pricePerDay!: string;

  @Column({
    name: 'price_per_hour',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  pricePerHour?: string;

  @Column()
  district!: string;

  /** Texto seguro para mapa público, sin calle ni número */
  @Column({ name: 'location_label' })
  locationLabel!: string;

  /** Coordenadas difusas (~500m) visibles en listados */
  @Column({ name: 'public_lat', type: 'double precision' })
  publicLat!: number;

  @Column({ name: 'public_lng', type: 'double precision' })
  publicLng!: number;

  /** Datos sensibles cifrados — nunca en respuestas públicas */
  @Column({ name: 'exact_address_encrypted', type: 'text' })
  exactAddressEncrypted!: string;

  @Column({ name: 'exact_lat_encrypted', type: 'text' })
  exactLatEncrypted!: string;

  @Column({ name: 'exact_lng_encrypted', type: 'text' })
  exactLngEncrypted!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProductStatus.ACTIVE,
  })
  status!: ProductStatus;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @OneToMany(() => Ad, (ad) => ad.product)
  ads!: Ad[];

  @OneToMany(() => ChatThread, (thread) => thread.product)
  chatThreads!: ChatThread[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
