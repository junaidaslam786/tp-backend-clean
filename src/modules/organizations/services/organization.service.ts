import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ClientsDataRepository } from '../repositories/clients-data.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { ClientsData } from '../interfaces/clients-data.interface';
import { User, UserRole } from '../../users/interfaces/user.interface';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
} from '../dto/organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly clientsDataRepository: ClientsDataRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createOrganization(
    createOrgDto: CreateOrganizationDto,
    currentUser?: User,
  ): Promise<OrganizationResponseDto> {
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

    // Validate permissions
    if (currentUser && !this.canCreateOrganization(currentUser)) {
      throw new ForbiddenException(
        'Insufficient permissions to create organization',
      );
    }

    const organization =
      await this.clientsDataRepository.createOrganization(createOrgDto);

    return this.toOrganizationResponseDto(organization);
  }

  async findByClientAndOrganization(
    clientName: string,
    organizationName: string,
    currentUser?: User,
  ): Promise<OrganizationResponseDto> {
    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (currentUser && !this.canViewOrganization(currentUser, organization)) {
      throw new ForbiddenException(
        'Insufficient permissions to view this organization',
      );
    }

    return this.toOrganizationResponseDto(organization);
  }

  async findByClientName(
    clientName: string,
    currentUser?: User,
  ): Promise<OrganizationResponseDto[]> {
    const organizations =
      await this.clientsDataRepository.findByClientName(clientName);

    if (!organizations || organizations.length === 0) {
      return [];
    }

    // Filter organizations based on user permissions
    const accessibleOrgs = organizations.filter((org) => {
      if (!currentUser) return false;
      return this.canViewOrganization(currentUser, org);
    });

    return accessibleOrgs.map((org) => this.toOrganizationResponseDto(org));
  }

  async updateOrganization(
    clientName: string,
    organizationName: string,
    updateOrgDto: UpdateOrganizationDto,
    currentUser: User,
  ): Promise<OrganizationResponseDto> {
    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!this.canManageOrganization(currentUser, organization)) {
      throw new ForbiddenException(
        'Insufficient permissions to update this organization',
      );
    }

    const updatedOrganization =
      await this.clientsDataRepository.updateOrganization(
        clientName,
        organizationName,
        updateOrgDto,
      );

    return this.toOrganizationResponseDto(updatedOrganization);
  }

  async addUserToOrganization(
    clientName: string,
    organizationName: string,
    userEmail: string,
    role: UserRole,
    currentUser: User,
  ): Promise<OrganizationResponseDto> {
    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!this.canManageOrganization(currentUser, organization)) {
      throw new ForbiddenException(
        'Insufficient permissions to add users to this organization',
      );
    }

    // Check if user exists
    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already in organization
    if (
      organization.admins.includes(userEmail) ||
      organization.viewers.includes(userEmail)
    ) {
      throw new BadRequestException('User is already in this organization');
    }

    // Add user based on role
    let updatedOrganization: ClientsData;
    if ([UserRole.ADMIN, UserRole.LE_ADMIN].includes(role)) {
      updatedOrganization = await this.clientsDataRepository.addAdmin(
        clientName,
        organizationName,
        userEmail,
      );
    } else {
      updatedOrganization = await this.clientsDataRepository.addViewer(
        clientName,
        organizationName,
        userEmail,
      );
    }

    return this.toOrganizationResponseDto(updatedOrganization);
  }

  async removeUserFromOrganization(
    clientName: string,
    organizationName: string,
    userEmail: string,
    currentUser: User,
  ): Promise<OrganizationResponseDto> {
    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!this.canManageOrganization(currentUser, organization)) {
      throw new ForbiddenException(
        'Insufficient permissions to remove users from this organization',
      );
    }

    // Check if user exists in organization
    const isAdmin = organization.admins.includes(userEmail);
    const isViewer = organization.viewers.includes(userEmail);

    if (!isAdmin && !isViewer) {
      throw new BadRequestException('User is not in this organization');
    }

    // Remove user from organization
    let updatedOrganization: ClientsData;
    if (isAdmin) {
      updatedOrganization = await this.clientsDataRepository.removeAdmin(
        clientName,
        organizationName,
        userEmail,
      );
    } else {
      updatedOrganization = await this.clientsDataRepository.removeViewer(
        clientName,
        organizationName,
        userEmail,
      );
    }

    return this.toOrganizationResponseDto(updatedOrganization);
  }

  async changeUserRole(
    clientName: string,
    organizationName: string,
    userEmail: string,
    newRole: UserRole,
    currentUser: User,
  ): Promise<OrganizationResponseDto> {
    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!this.canManageOrganization(currentUser, organization)) {
      throw new ForbiddenException(
        'Insufficient permissions to change user roles in this organization',
      );
    }

    // Check if user exists in organization
    const isAdmin = organization.admins.includes(userEmail);
    const isViewer = organization.viewers.includes(userEmail);

    if (!isAdmin && !isViewer) {
      throw new BadRequestException('User is not in this organization');
    }

    // Remove from current role list
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

    // Add to new role list
    let updatedOrganization: ClientsData;
    if ([UserRole.ADMIN, UserRole.LE_ADMIN].includes(newRole)) {
      updatedOrganization = await this.clientsDataRepository.addAdmin(
        clientName,
        organizationName,
        userEmail,
      );
    } else {
      updatedOrganization = await this.clientsDataRepository.addViewer(
        clientName,
        organizationName,
        userEmail,
      );
    }

    return this.toOrganizationResponseDto(updatedOrganization);
  }

  async deleteOrganization(
    clientName: string,
    organizationName: string,
    currentUser: User,
  ): Promise<void> {
    const organization =
      await this.clientsDataRepository.findByClientAndOrganization(
        clientName,
        organizationName,
      );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!this.canDeleteOrganization(currentUser)) {
      throw new ForbiddenException(
        'Insufficient permissions to delete this organization',
      );
    }

    await this.clientsDataRepository.deleteOrganization(
      clientName,
      organizationName,
    );
  }

  async searchOrganizations(
    searchFilters?: {
      search_term?: string;
      industry?: string;
      country?: string;
      domain?: string;
    },
    currentUser?: User,
  ): Promise<OrganizationResponseDto[]> {
    if (!currentUser) {
      return [];
    }

    let organizations: ClientsData[] = [];

    if (
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.PLATFORM_ADMIN
    ) {
      // Platform admins can search all organizations
      organizations = await this.clientsDataRepository.searchOrganizations(
        searchFilters || {},
      );
    } else {
      // Regular users can only see their organizations
      const accessibleOrgs: ClientsData[] = [];
      for (const orgName of currentUser.organizations) {
        // For each organization, try to find it by scanning client names
        const allClients = await this.clientsDataRepository.findByClientName(
          currentUser.client_name || '',
        );
        const orgMatch = allClients.find(
          (org) => org.organization_name === orgName,
        );
        if (orgMatch) {
          accessibleOrgs.push(orgMatch);
        }
      }

      // Apply search filters manually
      organizations = accessibleOrgs.filter((org) => {
        if (
          searchFilters?.search_term &&
          !org.organization_name
            .toLowerCase()
            .includes(searchFilters.search_term.toLowerCase()) &&
          !org.client_name
            .toLowerCase()
            .includes(searchFilters.search_term.toLowerCase())
        ) {
          return false;
        }
        if (
          searchFilters?.industry &&
          org.industry_sector !== searchFilters.industry
        ) {
          return false;
        }
        if (
          searchFilters?.country &&
          org.origin_country !== searchFilters.country
        ) {
          return false;
        }
        if (searchFilters?.domain && org.org_domain !== searchFilters.domain) {
          return false;
        }
        return true;
      });
    }

    return organizations.map((org) => this.toOrganizationResponseDto(org));
  }

  // Permission helper methods
  private canCreateOrganization(currentUser: User): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.PLATFORM_ADMIN,
      UserRole.LE_ADMIN,
    ].includes(currentUser.role);
  }

  private canViewOrganization(
    currentUser: User,
    organization: ClientsData,
  ): boolean {
    // Super admin and platform admin can view all organizations
    if (
      [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(currentUser.role)
    ) {
      return true;
    }

    // Check if user belongs to the organization
    return (
      organization.admins.includes(currentUser.email) ||
      organization.viewers.includes(currentUser.email) ||
      currentUser.organizations.includes(organization.organization_name)
    );
  }

  private canManageOrganization(
    currentUser: User,
    organization: ClientsData,
  ): boolean {
    // Super admin and platform admin can manage all organizations
    if (
      [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(currentUser.role)
    ) {
      return true;
    }

    // LE_ADMIN can manage organizations they belong to
    if (
      currentUser.role === UserRole.LE_ADMIN &&
      (organization.admins.includes(currentUser.email) ||
        currentUser.organizations.includes(organization.organization_name))
    ) {
      return true;
    }

    // ADMIN can manage organizations they are admin of
    if (
      currentUser.role === UserRole.ADMIN &&
      organization.admins.includes(currentUser.email)
    ) {
      return true;
    }

    return false;
  }

  private canDeleteOrganization(currentUser: User): boolean {
    // Only super admin and platform admin can delete organizations
    return [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(
      currentUser.role,
    );
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
