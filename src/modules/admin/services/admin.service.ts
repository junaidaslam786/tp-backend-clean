import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRepository } from '../../users/repositories/user.repository';
import { ClientsDataRepository } from '../../organizations/repositories/clients-data.repository';
import {
  User,
  UserRole,
  UserStatus,
} from '../../users/interfaces/user.interface';
import { ClientsData } from '../../organizations/interfaces/clients-data.interface';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '../../users/dto/user.dto';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
} from '../../organizations/dto/organization.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly clientsDataRepository: ClientsDataRepository,
  ) {}

  // Platform Admin User Management
  async getAllUsers(currentUser: User): Promise<UserResponseDto[]> {
    this.validatePlatformAdminAccess(currentUser);

    // Since scanUsers doesn't exist, use searchUsers with empty filters
    const users = await this.userRepository.searchUsers({});
    return users.map((user) => this.toUserResponseDto(user));
  }

  async getUserById(
    userId: string,
    currentUser: User,
  ): Promise<UserResponseDto> {
    this.validatePlatformAdminAccess(currentUser);

    const user = await this.userRepository.findByEmail(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponseDto(user);
  }

  async createUserAsAdmin(
    createUserDto: CreateUserDto,
    currentUser: User,
  ): Promise<UserResponseDto> {
    this.validatePlatformAdminAccess(currentUser);

    const user = await this.userRepository.createUser(createUserDto);
    return this.toUserResponseDto(user);
  }

  async updateUserAsAdmin(
    userEmail: string,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<UserResponseDto> {
    this.validatePlatformAdminAccess(currentUser);

    const existingUser = await this.userRepository.findByEmail(userEmail);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.updateUser(
      userEmail,
      updateUserDto,
    );
    return this.toUserResponseDto(updatedUser);
  }

  async suspendUser(userEmail: string, currentUser: User): Promise<void> {
    this.validatePlatformAdminAccess(currentUser);

    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.updateUser(userEmail, {
      status: UserStatus.SUSPENDED,
    });
  }

  async activateUser(userEmail: string, currentUser: User): Promise<void> {
    this.validatePlatformAdminAccess(currentUser);

    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.updateUser(userEmail, {
      status: UserStatus.ACTIVE,
    });
  }

  async deleteUser(userEmail: string, currentUser: User): Promise<void> {
    this.validatePlatformAdminAccess(currentUser);

    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove user from all organizations
    if (user.organizations?.length) {
      for (const orgName of user.organizations) {
        const organization =
          await this.clientsDataRepository.findByClientAndOrganization(
            user.client_name || '',
            orgName,
          );
        if (organization) {
          // Remove from admin list
          if (organization.admins.includes(userEmail)) {
            await this.clientsDataRepository.removeAdmin(
              user.client_name || '',
              orgName,
              userEmail,
            );
          }
          // Remove from viewer list
          if (organization.viewers.includes(userEmail)) {
            await this.clientsDataRepository.removeViewer(
              user.client_name || '',
              orgName,
              userEmail,
            );
          }
        }
      }
    }

    await this.userRepository.deleteUser(userEmail);
  }

  // Platform Admin Organization Management
  async getAllOrganizations(
    currentUser: User,
    filters?: {
      client_name?: string;
      industry?: string;
      country?: string;
    },
  ): Promise<OrganizationResponseDto[]> {
    this.validatePlatformAdminAccess(currentUser);

    const organizations = await this.clientsDataRepository.searchOrganizations(
      filters || {},
    );
    return organizations.map((org) => this.toOrganizationResponseDto(org));
  }

  async createOrganizationAsAdmin(
    createOrgDto: CreateOrganizationDto,
    currentUser: User,
  ): Promise<OrganizationResponseDto> {
    this.validatePlatformAdminAccess(currentUser);

    // Check if organization already exists
    const existingOrgs = await this.clientsDataRepository.findByClientName(
      createOrgDto.client_name,
    );

    const orgExists = existingOrgs.some(
      (org) => org.organization_name === createOrgDto.organization_name,
    );

    if (orgExists) {
      throw new BadRequestException(
        'Organization with this name already exists for this client',
      );
    }

    const organization =
      await this.clientsDataRepository.createOrganization(createOrgDto);

    return this.toOrganizationResponseDto(organization);
  }

  async updateOrganizationAsAdmin(
    clientName: string,
    organizationName: string,
    updateOrgDto: UpdateOrganizationDto,
    currentUser: User,
  ): Promise<OrganizationResponseDto> {
    this.validatePlatformAdminAccess(currentUser);

    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updatedOrganization =
      await this.clientsDataRepository.updateOrganization(
        clientName,
        organizationName,
        updateOrgDto,
      );

    return this.toOrganizationResponseDto(updatedOrganization);
  }

  async deleteOrganizationAsAdmin(
    clientName: string,
    organizationName: string,
    currentUser: User,
  ): Promise<void> {
    this.validatePlatformAdminAccess(currentUser);

    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Note: Since UpdateUserDto doesn't have organizations property,
    // we skip updating user organizations for now
    await this.clientsDataRepository.deleteOrganization(
      clientName,
      organizationName,
    );
  }

  // Cross-Organization User Management
  async assignUserToOrganization(
    userEmail: string,
    clientName: string,
    organizationName: string,
    role: UserRole,
    currentUser: User,
  ): Promise<void> {
    this.validatePlatformAdminAccess(currentUser);

    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is already in organization
    if (
      organization.admins.includes(userEmail) ||
      organization.viewers.includes(userEmail)
    ) {
      throw new BadRequestException('User is already in this organization');
    }

    // Add user to organization
    if ([UserRole.ADMIN, UserRole.LE_ADMIN].includes(role)) {
      await this.clientsDataRepository.addAdmin(
        clientName,
        organizationName,
        userEmail,
      );
    } else {
      await this.clientsDataRepository.addViewer(
        clientName,
        organizationName,
        userEmail,
      );
    }

    // Note: Since UpdateUserDto doesn't have organizations property,
    // we skip updating user organizations for now
  }

  async removeUserFromOrganization(
    userEmail: string,
    clientName: string,
    organizationName: string,
    currentUser: User,
  ): Promise<void> {
    this.validatePlatformAdminAccess(currentUser);

    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const isAdmin = organization.admins.includes(userEmail);
    const isViewer = organization.viewers.includes(userEmail);

    if (!isAdmin && !isViewer) {
      throw new BadRequestException('User is not in this organization');
    }

    // Remove user from organization
    if (isAdmin) {
      await this.clientsDataRepository.removeAdmin(
        clientName,
        organizationName,
        userEmail,
      );
    } else {
      await this.clientsDataRepository.removeViewer(
        clientName,
        organizationName,
        userEmail,
      );
    }

    // Note: Since UpdateUserDto doesn't have organizations property,
    // we skip updating user organizations for now
  }

  // System Statistics and Reporting
  async getSystemStatistics(currentUser: User): Promise<{
    totalUsers: number;
    totalOrganizations: number;
    activeUsers: number;
    suspendedUsers: number;
    usersByRole: Record<UserRole, number>;
    organizationsByIndustry: Record<string, number>;
  }> {
    this.validatePlatformAdminAccess(currentUser);

    // Get all users and organizations
    const allUsers = await this.userRepository.searchUsers({});
    const allOrganizations =
      await this.clientsDataRepository.searchOrganizations({});

    // Calculate statistics
    const totalUsers = allUsers.length;
    const totalOrganizations = allOrganizations.length;
    const activeUsers = allUsers.filter(
      (user) => user.status === UserStatus.ACTIVE,
    ).length;
    const suspendedUsers = allUsers.filter(
      (user) => user.status === UserStatus.SUSPENDED,
    ).length;

    // Users by role
    const usersByRole: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.LE_ADMIN]: 0,
      [UserRole.VIEWER]: 0,
      [UserRole.PLATFORM_ADMIN]: 0,
      [UserRole.SUPER_ADMIN]: 0,
    };

    allUsers.forEach((user) => {
      usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
    });

    // Organizations by industry
    const organizationsByIndustry: Record<string, number> = {};
    allOrganizations.forEach((org) => {
      const industry = org.industry_sector || 'Unknown';
      organizationsByIndustry[industry] =
        (organizationsByIndustry[industry] || 0) + 1;
    });

    return {
      totalUsers,
      totalOrganizations,
      activeUsers,
      suspendedUsers,
      usersByRole,
      organizationsByIndustry,
    };
  }

  // Helper methods
  private validatePlatformAdminAccess(currentUser: User): void {
    if (
      ![UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(
        currentUser.role,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient permissions for platform admin operations',
      );
    }
  }

  private toUserResponseDto(user: User): UserResponseDto {
    return {
      email: user.email,
      full_name: user.name,
      organization_name: user.organizations?.[0] || '',
      org_domain: '', // Not available in User interface
      role: user.role,
      status: user.status,
      phone_number: user.phone,
      job_title: '', // Not available in User interface
      department: '', // Not available in User interface
      email_verified: true, // Default value
      last_login: user.last_login_at,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  private toOrganizationResponseDto(
    organization: ClientsData,
  ): OrganizationResponseDto {
    return {
      client_name: organization.client_name,
      organization_name: organization.organization_name,
      org_domain: organization.org_domain,
      org_home_link: organization.org_home_link,
      org_about_us_link: organization.org_about_us_link,
      origin_country: organization.origin_country,
      operating_countries: organization.operating_countries,
      government: organization.government,
      industry_sector: organization.industry_sector,
      company_size: organization.company_size,
      annual_revenue: organization.annual_revenue,
      description: organization.description,
      website: organization.website,
      phone: organization.phone,
      address: organization.address,
      total_users: organization.total_users,
      app_count: organization.app_count,
      active_runs: organization.active_runs,
      admins: organization.admins,
      viewers: organization.viewers,
      compliance_frameworks: organization.compliance_frameworks,
      security_certifications: organization.security_certifications,
      additional_context: organization.additional_context,
      created_at: organization.createdAt,
      updated_at: organization.updatedAt,
    };
  }
}
