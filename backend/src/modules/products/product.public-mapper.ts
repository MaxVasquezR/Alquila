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
  coverImageUrl?: string;
  imageUrls: string[];
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
  publishedAt?: Date;
  expiresAt?: Date;
  owner: PublicOwnerDto;
  createdAt: Date;
  isFeatured?: boolean;
  promotionLabel?: string;
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
  options?: { isFeatured?: boolean; promotionLabel?: string },
): ProductPublicDto {
  const orderedImages = [...(product.images ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => image.url);
  const coverImageUrl = product.coverImageUrl ?? product.imageUrl ?? orderedImages[0];

  return {
    id: product.id,
    title: product.title,
    imageUrl: coverImageUrl ?? undefined,
    coverImageUrl: coverImageUrl ?? undefined,
    imageUrls: orderedImages.length > 0 ? orderedImages : coverImageUrl ? [coverImageUrl] : [],
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
    publishedAt: product.publishedAt,
    expiresAt: product.expiresAt,
    owner: toPublicOwner(product.owner),
    createdAt: product.createdAt,
    isFeatured: options?.isFeatured,
    promotionLabel: options?.promotionLabel,
  };
}
