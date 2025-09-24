import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { ClientsDataRepository } from '../../organizations/repositories/clients-data.repository';
import { User, UserRole, UserStatus } from '../interfaces/user.interface';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly clientsDataRepository: ClientsDataRepository,
    // private readonly cognitoService: CognitoService, // TODO: Add when implementing
  ) {}

  async createUser(
    createUserDto: CreateUserDto,
    currentUser?: User,
  ): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // For simplified version, just create the user
    const user = await this.userRepository.createUser(createUserDto);

    // TODO: Send welcome email via Cognito/SES
    // await this.cognitoService.createUser(user.email, user.name);

    return this.toUserResponseDto(user);
  }

  async updateUser(
    email: string,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check permissions
    if (!this.canUpdateUser(currentUser, user)) {
      throw new ForbiddenException(
        'Insufficient permissions to update this user',
      );
    }

    const updatedUser = await this.userRepository.updateUser(
      email,
      updateUserDto,
    );
    return this.toUserResponseDto(updatedUser);
  }

  async findByEmail(
    email: string,
    currentUser?: User,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (currentUser && !this.canViewUser(currentUser, user)) {
      throw new ForbiddenException(
        'Insufficient permissions to view this user',
      );
    }

    return this.toUserResponseDto(user);
  }

  async findByOrganization(
    organizationName: string,
    currentUser?: User,
  ): Promise<UserResponseDto[]> {
    if (
      currentUser &&
      !this.canViewOrganization(currentUser, organizationName)
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to view organization users',
      );
    }

    const users =
      await this.userRepository.findByOrganization(organizationName);
    return users.map((user) => this.toUserResponseDto(user));
  }

  async searchUsers(
    searchFilters?: {
      search_term?: string;
      role?: UserRole;
      status?: UserStatus;
      organization?: string;
    },
    currentUser?: User,
  ): Promise<UserResponseDto[]> {
    if (!currentUser) {
      return [];
    }

    // Get users based on current user's permissions
    let users: User[] = [];

    if (
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.PLATFORM_ADMIN
    ) {
      // Can search all users
      users = await this.userRepository.searchUsers(searchFilters || {});
    } else {
      // Can only search within accessible organizations
      const accessibleUsers: User[] = [];
      for (const orgName of currentUser.organizations) {
        if (this.canViewOrganization(currentUser, orgName)) {
          const orgUsers =
            await this.userRepository.findByOrganization(orgName);
          accessibleUsers.push(...orgUsers);
        }
      }

      // Apply search filters manually for limited users
      users = accessibleUsers.filter((user) => {
        if (
          searchFilters?.search_term &&
          !user.name
            .toLowerCase()
            .includes(searchFilters.search_term.toLowerCase()) &&
          !user.email
            .toLowerCase()
            .includes(searchFilters.search_term.toLowerCase())
        ) {
          return false;
        }
        if (searchFilters?.role && user.role !== searchFilters.role) {
          return false;
        }
        if (searchFilters?.status && user.status !== searchFilters.status) {
          return false;
        }
        return true;
      });
    }

    return users.map((user) => this.toUserResponseDto(user));
  }

  async activateUser(
    email: string,
    currentUser: User,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.canManageUser(currentUser, user)) {
      throw new ForbiddenException(
        'Insufficient permissions to activate this user',
      );
    }

    if (user.status !== UserStatus.PENDING_APPROVAL) {
      throw new BadRequestException('User is not in pending approval status');
    }

    const updatedUser = await this.userRepository.activateUser(email);

    // TODO: Send activation email
    // await this.cognitoService.enableUser(user.email);

    return this.toUserResponseDto(updatedUser);
  }

  async suspendUser(
    email: string,
    currentUser: User,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.canManageUser(currentUser, user)) {
      throw new ForbiddenException(
        'Insufficient permissions to suspend this user',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('User is already suspended');
    }

    const updatedUser = await this.userRepository.suspendUser(email);

    // TODO: Disable in Cognito
    // await this.cognitoService.disableUser(user.email);

    return this.toUserResponseDto(updatedUser);
  }

  async deleteUser(email: string, currentUser: User): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.canDeleteUser(currentUser, user)) {
      throw new ForbiddenException(
        'Insufficient permissions to delete this user',
      );
    }

    await this.userRepository.deleteUser(email);

    // TODO: Delete from Cognito
    // await this.cognitoService.deleteUser(user.email);
  }

  // Permission helper methods
  private canViewUser(currentUser: User, targetUser: User): boolean {
    // Super admin and platform admin can view all users
    if (
      [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(currentUser.role)
    ) {
      return true;
    }

    // Users can view themselves
    if (currentUser.email === targetUser.email) {
      return true;
    }

    // Check if users share any organizations and current user has sufficient role
    const sharedOrgs = currentUser.organizations.filter((org) =>
      targetUser.organizations.includes(org),
    );
    if (sharedOrgs.length > 0) {
      // LE_ADMIN and ADMIN can view users in their organizations
      return [UserRole.LE_ADMIN, UserRole.ADMIN].includes(currentUser.role);
    }

    return false;
  }

  private canUpdateUser(currentUser: User, targetUser: User): boolean {
    // Super admin can update all users
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Platform admin can update non-super-admin users
    if (
      currentUser.role === UserRole.PLATFORM_ADMIN &&
      targetUser.role !== UserRole.SUPER_ADMIN
    ) {
      return true;
    }

    // Users can update themselves (limited fields)
    if (currentUser.email === targetUser.email) {
      return true;
    }

    // Check organization management permissions
    const sharedOrgs = currentUser.organizations.filter((org) =>
      targetUser.organizations.includes(org),
    );
    if (sharedOrgs.length > 0) {
      // LE_ADMIN can update non-platform-admin users in their organizations
      if (
        currentUser.role === UserRole.LE_ADMIN &&
        ![UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(
          targetUser.role,
        )
      ) {
        return true;
      }

      // ADMIN can update viewers in their organizations
      if (
        currentUser.role === UserRole.ADMIN &&
        targetUser.role === UserRole.VIEWER
      ) {
        return true;
      }
    }

    return false;
  }

  private canManageUser(currentUser: User, targetUser: User): boolean {
    // Super admin can manage all users
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Platform admin can manage non-super-admin users
    if (
      currentUser.role === UserRole.PLATFORM_ADMIN &&
      targetUser.role !== UserRole.SUPER_ADMIN
    ) {
      return true;
    }

    // Check organization management permissions
    const sharedOrgs = currentUser.organizations.filter((org) =>
      targetUser.organizations.includes(org),
    );
    if (sharedOrgs.length > 0) {
      // LE_ADMIN can manage non-platform-admin users in their organizations
      if (
        currentUser.role === UserRole.LE_ADMIN &&
        ![UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(
          targetUser.role,
        )
      ) {
        return true;
      }

      // ADMIN can manage viewers in their organizations
      if (
        currentUser.role === UserRole.ADMIN &&
        targetUser.role === UserRole.VIEWER
      ) {
        return true;
      }
    }

    return false;
  }

  private canDeleteUser(currentUser: User, targetUser: User): boolean {
    // Only super admin and platform admin can delete users
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (
      currentUser.role === UserRole.PLATFORM_ADMIN &&
      targetUser.role !== UserRole.SUPER_ADMIN
    ) {
      return true;
    }

    return false;
  }

  private canViewOrganization(
    currentUser: User,
    organizationName: string,
  ): boolean {
    // Super admin and platform admin can view all organizations
    if (
      [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(currentUser.role)
    ) {
      return true;
    }

    // Check if user belongs to the organization
    return currentUser.organizations.includes(organizationName);
  }

  private toUserResponseDto(user: User): UserResponseDto {
    return {
      email: user.email,
      full_name: user.name,
      organization_name: user.organizations[0] || '', // Primary organization
      org_domain: '', // TODO: Get from organization data
      role: user.role,
      status: user.status,
      phone_number: user.phone,
      job_title: '', // TODO: Add to user interface if needed
      department: '', // TODO: Add to user interface if needed
      email_verified: user.status === UserStatus.ACTIVE,
      last_login: user.last_login_at,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      preferences: {
        notifications: {
          email_reports: user.preferences?.notifications_email,
          security_alerts: user.preferences?.notifications_sms,
          product_updates: true,
        },
        dashboard: {
          default_view: user.preferences?.theme || 'light',
          items_per_page: 10,
        },
        locale: {
          language: user.preferences?.language || 'en',
          timezone: user.preferences?.timezone || 'UTC',
          date_format: 'MM/DD/YYYY',
        },
      },
    };
  }
}
