import type { FeatureKey, BusinessProfile, AuthUser } from "./types";
import { FEATURE_KEYS, FREE_TIER_LIMITS } from "./types";

// Check if the user has access to a specific feature.
// A feature is unlocked if:
//   1. User is admin (always has everything), OR
//   2. User has an active subscription AND the feature is in their allocatedFeatures list
export function can(
  user: { role: string; subscriptionStatus: string; allocatedFeatures: FeatureKey[] } | null,
  feature: FeatureKey,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.subscriptionStatus !== "active") return false;
  return user.allocatedFeatures.includes(feature);
}

// Check if user can create more documents (free tier limit)
export function canCreateDocument(
  profile: Pick<BusinessProfile, "role" | "subscriptionStatus" | "allocatedFeatures">,
  currentDocCount: number,
): boolean {
  if (can(profile, "unlimited_documents")) return true;
  return currentDocCount < FREE_TIER_LIMITS.maxDocuments;
}

// Check if user can add more clients
export function canCreateClient(
  profile: Pick<BusinessProfile, "role" | "subscriptionStatus" | "allocatedFeatures">,
  currentClientCount: number,
): boolean {
  if (can(profile, "unlimited_clients")) return true;
  return currentClientCount < FREE_TIER_LIMITS.maxClients;
}

// Days remaining in subscription (0 if expired/none)
export function daysRemaining(expiresAt?: string): number {
  if (!expiresAt) return 0;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Check if a subscription has expired (server-side check)
export function isSubscriptionExpired(expiresAt?: string): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now();
}

// Default features allocated when admin marks a user as paid (all features)
export const ALL_FEATURES: FeatureKey[] = [...FEATURE_KEYS];

// Format the subscription status for display
export function subscriptionLabel(status: string, expiresAt?: string): string {
  if (status === "active") {
    const days = daysRemaining(expiresAt);
    return `Pro · ${days} days left`;
  }
  if (status === "expired") return "Subscription expired";
  return "Free plan";
}
