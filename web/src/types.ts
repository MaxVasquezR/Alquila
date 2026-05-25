export interface PublicOwner {
  id: string;
  displayName: string;
  kycVerified: boolean;
  membershipTier: string;
  avatarUrl?: string;
  dealsClosedCount?: number;
}

export interface Product {
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
  location: { lat: number; lng: number };
  status: string;
  publishedAt?: string;
  expiresAt?: string;
  deletedAt?: string;
  createdAt?: string;
  owner: PublicOwner;
  isFeatured?: boolean;
  promotionLabel?: string;
  paymentRequired?: boolean;
  listingFeePen?: number;
}

export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface User {
  id: string;
  email: string;
  emailVerified?: boolean;
  displayName: string;
  kycVerified: boolean;
  kycStatus?: KycStatus;
  phoneVerified?: boolean;
  avatarUrl?: string;
  membershipTier: string;
  membershipExpiresAt?: string;
  dealsClosedCount?: number;
  canPublish?: boolean;
}

export interface AccountSummary {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl?: string;
  kycStatus: KycStatus;
  kycVerified: boolean;
  kycVerifiedAt?: string;
  phoneVerified: boolean;
  membershipTier: string;
  membershipExpiresAt?: string;
  commerce?: {
    freeListingConsumed: boolean;
    freeListingConsumedAt?: string;
    paidListings: number;
    superPromos: number;
    totalRevenuePen: number;
  };
  stats: {
    products: number;
    dealsClosed: number;
    dealsAsOwner: number;
    dealsAsTenant: number;
  };
}

export interface ChatMessage {
  id: string;
  threadId?: string;
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
}

export interface DealCheckpointPhoto {
  id: string;
  url: string;
  sortOrder: number;
}

export interface DealCheckpoint {
  id: string;
  threadId: string;
  stage: 'HANDOFF' | 'RETURN';
  notes?: string;
  createdAt: string;
  submittedBy?: string;
  photos: DealCheckpointPhoto[];
}

export interface ChatThread {
  id: string;
  productId: string;
  ownerId: string;
  tenantId: string;
  ownerAcceptedContact: boolean;
  tenantQuestionnaireCompleted: boolean;
}

export interface ListingPaymentResult {
  paymentId?: string;
  productId: string;
  amountPen?: number;
  qrPayload?: string;
  provider?: string;
  plan?: string;
  freeListing?: boolean;
  status?: string;
  expiresInMinutes?: number;
  durationDays?: number;
  listingExpiresAt?: string;
  promoEndsAt?: string;
}
