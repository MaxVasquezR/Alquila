import { Product } from '../../entities/product.entity';
import { User } from '../../entities/user.entity';

export interface PublicOwnerDto {
  id: string;
  displayName: string;
  kycVerified: boolean;
  membershipTier: string;
  avatarUrl?: string;
}

export interface ProductPublicDto {
  id: string;
  title: string;
  imageUrl?: string;
  availableToday: boolean;
  description: string;
  category: string;
  pricePerDay: string;
  pricePerHour?: string;
  district: string;
  locationLabel: string;
  location: {
    lat: number;
    lng: number;
  };
  status: string;
  owner: PublicOwnerDto;
  createdAt: Date;
  isFeatured?: boolean;
}

/** Mapper que garantiza que datos sensibles del dueño nunca salen en listados públicos */
export function toPublicOwner(owner: User): PublicOwnerDto {
  return {
    id: owner.id,
    displayName: owner.displayName,
    kycVerified: owner.kycVerified,
    membershipTier: owner.membershipTier,
    avatarUrl: owner.avatarUrl,
  };
}

export function toProductPublicDto(
  product: Product,
  options?: { isFeatured?: boolean },
): ProductPublicDto {
  return {
    id: product.id,
    title: product.title,
    imageUrl: product.imageUrl ?? undefined,
    availableToday: product.availableToday,
    description: product.description,
    category: product.category,
    pricePerDay: product.pricePerDay,
    pricePerHour: product.pricePerHour,
    district: product.district,
    locationLabel: product.locationLabel,
    location: {
      lat: product.publicLat,
      lng: product.publicLng,
    },
    status: product.status,
    owner: toPublicOwner(product.owner),
    createdAt: product.createdAt,
    isFeatured: options?.isFeatured,
  };
}
