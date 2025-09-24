import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Metadata key for roles decorator
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator to specify required roles for endpoints
 * @param roles - Array of required user roles
 * @returns MethodDecorator
 */
export const Roles = (...roles: UserRole[]) => {
  return (target: any, propertyKey?: string) => {
    Reflect.defineMetadata(ROLES_KEY, roles, target, propertyKey);
  };
};

/**
 * Role-Based Access Control Guard
 * Validates user has required role to access endpoint
 * Works in conjunction with JWT Auth Guard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Validates the authenticated user has required roles
   * @param context - The execution context
   * @returns boolean - True if user has required role
   * @throws ForbiddenException - If user lacks required role
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JWT Auth Guard)
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some((role) =>
      this.userHasRole(user, role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Checks if user has a specific role
   * @param user - The authenticated user
   * @param role - The role to check
   * @returns boolean - True if user has the role
   */
  private userHasRole(
    user: AuthenticatedRequest['user'],
    role: UserRole,
  ): boolean {
    // Check direct role assignment
    if (user.role === role) {
      return true;
    }

    // Check Cognito groups for role
    if (user.cognitoGroups.includes(role)) {
      return true;
    }

    // Platform admin has access to everything
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    // Organization admin has access to partner and user functions
    if (
      user.role === UserRole.ORG_ADMIN &&
      (role === UserRole.PARTNER || role === UserRole.USER)
    ) {
      return true;
    }

    return false;
  }
}
