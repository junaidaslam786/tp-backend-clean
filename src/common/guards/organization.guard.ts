import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Metadata key for organization access decorator
 */
export const REQUIRE_ORGANIZATION_KEY = 'requireOrganization';

/**
 * Organization access decorator to require organization context
 * @param required - Whether organization context is required
 * @returns MethodDecorator
 */
export const RequireOrganization = (required: boolean = true) => {
  return (target: any, propertyKey?: string) => {
    Reflect.defineMetadata(
      REQUIRE_ORGANIZATION_KEY,
      required,
      target,
      propertyKey,
    );
  };
};

/**
 * Organization-Based Access Control Guard
 * Validates user has access to organization-specific resources
 * Works in conjunction with JWT Auth Guard
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Validates the user has appropriate organization access
   * @param context - The execution context
   * @returns boolean - True if user has organization access
   * @throws ForbiddenException - If user lacks organization access
   */
  canActivate(context: ExecutionContext): boolean {
    // Check if organization context is required
    const requireOrganization = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ORGANIZATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If organization context is not required, allow access
    if (requireOrganization === false) {
      return true;
    }

    // Get user from request (set by JWT Auth Guard)
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Get organization ID from request params or body
    const organizationId = this.extractOrganizationId(request);

    // Validate organization access
    return this.validateOrganizationAccess(user, organizationId);
  }

  /**
   * Extracts organization ID from request
   * @param request - The HTTP request
   * @returns string | undefined - The organization ID
   */
  private extractOrganizationId(
    request: AuthenticatedRequest,
  ): string | undefined {
    // Check URL parameters first
    const paramOrgId = request.params?.organizationId;
    if (paramOrgId) {
      return paramOrgId;
    }

    // Check query parameters
    const queryOrgId = request.query?.organizationId as string;
    if (queryOrgId) {
      return queryOrgId;
    }

    // Check request body
    const bodyOrgId = request.body?.organizationId;
    if (bodyOrgId) {
      return bodyOrgId;
    }

    return undefined;
  }

  /**
   * Validates user has access to the specified organization
   * @param user - The authenticated user
   * @param organizationId - The organization ID to validate
   * @returns boolean - True if user has access
   * @throws ForbiddenException - If access is denied
   */
  private validateOrganizationAccess(
    user: AuthenticatedRequest['user'],
    organizationId?: string,
  ): boolean {
    // Platform admin has access to all organizations
    if (user.role === 'PLATFORM_ADMIN') {
      return true;
    }

    // If no organization ID is provided or required
    if (!organizationId) {
      // User must have an organization context
      if (!user.organizationId) {
        throw new ForbiddenException(
          'Organization context is required for this operation',
        );
      }
      return true;
    }

    // User must belong to the requested organization
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Access denied: You do not have access to this organization',
      );
    }

    return true;
  }
}
