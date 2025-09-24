import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionTier } from '../enums/subscription-tier.enum';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Metadata key for subscription tiers decorator
 */
export const SUBSCRIPTION_TIERS_KEY = 'subscriptionTiers';

/**
 * Subscription tiers decorator to specify required subscription levels
 * @param tiers - Array of required subscription tiers
 * @returns MethodDecorator
 */
export const RequireSubscription = (...tiers: SubscriptionTier[]) => {
  return (target: any, propertyKey?: string) => {
    Reflect.defineMetadata(SUBSCRIPTION_TIERS_KEY, tiers, target, propertyKey);
  };
};

/**
 * Subscription-Based Access Control Guard
 * Validates user has required subscription tier to access endpoint
 * Works in conjunction with JWT Auth Guard
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Validates the authenticated user has required subscription tier
   * @param context - The execution context
   * @returns boolean - True if user has required subscription
   * @throws ForbiddenException - If user lacks required subscription
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required subscription tiers from metadata
    const requiredTiers = this.reflector.getAllAndOverride<SubscriptionTier[]>(
      SUBSCRIPTION_TIERS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no subscription tiers are required, allow access
    if (!requiredTiers || requiredTiers.length === 0) {
      return true;
    }

    // Get user from request (set by JWT Auth Guard)
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Get user's subscription tier
    const userTier = user.subscriptionTier as SubscriptionTier;

    if (!userTier) {
      throw new ForbiddenException('No subscription found');
    }

    // Check if user has any of the required subscription tiers
    const hasRequiredTier = requiredTiers.some((tier) =>
      this.userHasSubscription(userTier, tier),
    );

    if (!hasRequiredTier) {
      throw new ForbiddenException(
        `Access denied. Required subscription: ${requiredTiers.join(' or ')}`,
      );
    }

    return true;
  }

  /**
   * Checks if user's subscription tier meets the requirement
   * @param userTier - User's current subscription tier
   * @param requiredTier - Required subscription tier
   * @returns boolean - True if user meets subscription requirement
   */
  private userHasSubscription(
    userTier: SubscriptionTier,
    requiredTier: SubscriptionTier,
  ): boolean {
    // Define tier hierarchy (higher tier includes lower tier features)
    const tierHierarchy = {
      [SubscriptionTier.BASIC]: 1,
      [SubscriptionTier.PRO]: 2,
      [SubscriptionTier.ENTERPRISE]: 3,
    };

    // User tier must be equal or higher than required tier
    return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
  }
}
