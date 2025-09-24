import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ClientsDataRepository } from '../repositories/clients-data.repository';
import {
  ClientsData,
  OrganizationSize,
} from '../interfaces/clients-data.interface';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationSearchDto,
  AddUserToOrganizationDto,
  ChangeUserRoleInOrganizationDto,
} from '../dto/organization.dto';

/**
 * Organizations Service
 * Business logic for organization management operations
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly clientsDataRepository: ClientsDataRepository) {}

  /**
   * Create new organization
   * @param createData - Organization creation data
   * @returns Promise with created organization
   */
  async createOrganization(
    createData: CreateOrganizationDto,
  ): Promise<ClientsData> {
    // 1. Validate domain uniqueness
    const existingByDomain = await this.clientsDataRepository.findByDomain(
      createData.org_domain,
    );
    if (existingByDomain.length > 0) {
      throw new ConflictException(
        `Organization with domain ${createData.org_domain} already exists`,
      );
    }

    // 2. Check client + organization name uniqueness
    const existing = await this.clientsDataRepository.findByClientAndOrganization(
      createData.client_name,
      createData.organization_name,
    );
    if (existing) {
      throw new ConflictException(
        `Organization ${createData.organization_name} already exists for client ${createData.client_name}`,
      );
    }

    // 3. Validate at least one admin is provided
    if (!createData.admins || createData.admins.length === 0) {
      throw new BadRequestException(
        'At least one admin email must be provided',
      );
    }

    // 4. Create organization
    return this.clientsDataRepository.createOrganization(createData);
  }

  /**
   * Get organization by client and organization name
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @returns Promise with organization
   */
  async getOrganization(
    clientName: string,
    organizationName: string,
  ): Promise<ClientsData> {
    const organization = await this.clientsDataRepository.findByClientAndOrganization(
      clientName,
      organizationName,
    );
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  /**
   * Update organization
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @param updateData - Organization update data
   * @returns Promise with updated organization
   */
  async updateOrganization(
    clientName: string,
    organizationName: string,
    updateData: UpdateOrganizationDto,
  ): Promise<ClientsData> {
    // Validate organization exists
    await this.getOrganization(clientName, organizationName);

    // Update organization
    return this.clientsDataRepository.updateOrganization(
      clientName,
      organizationName,
      updateData,
    );
  }

  /**
   * Delete organization
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @returns Promise with deletion result
   */
  async deleteOrganization(
    clientName: string,
    organizationName: string,
  ): Promise<void> {
    // Validate organization exists
    await this.getOrganization(clientName, organizationName);

    // Delete organization
    await this.clientsDataRepository.deleteOrganization(
      clientName,
      organizationName,
    );
  }

  /**
   * Get organizations by client name
   * @param clientName - Client name
   * @returns Promise with organizations list
   */
  async getOrganizationsByClient(clientName: string): Promise<ClientsData[]> {
    return this.clientsDataRepository.findByClientName(clientName);
  }

  /**
   * Add admin to organization
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @param adminEmail - Admin email to add
   * @returns Promise with updated organization
   */
  async addAdmin(
    clientName: string,
    organizationName: string,
    adminEmail: string,
  ): Promise<ClientsData> {
    return this.clientsDataRepository.addAdmin(
      clientName,
      organizationName,
      adminEmail,
    );
  }

  /**
   * Remove admin from organization
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @param adminEmail - Admin email to remove
   * @returns Promise with updated organization
   */
  async removeAdmin(
    clientName: string,
    organizationName: string,
    adminEmail: string,
  ): Promise<ClientsData> {
    return this.clientsDataRepository.removeAdmin(
      clientName,
      organizationName,
      adminEmail,
    );
  }

  /**
   * Add viewer to organization
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @param viewerEmail - Viewer email to add
   * @returns Promise with updated organization
   */
  async addViewer(
    clientName: string,
    organizationName: string,
    viewerEmail: string,
  ): Promise<ClientsData> {
    return this.clientsDataRepository.addViewer(
      clientName,
      organizationName,
      viewerEmail,
    );
  }

  /**
   * Remove viewer from organization
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @param viewerEmail - Viewer email to remove
   * @returns Promise with updated organization
   */
  async removeViewer(
    clientName: string,
    organizationName: string,
    viewerEmail: string,
  ): Promise<ClientsData> {
    return this.clientsDataRepository.removeViewer(
      clientName,
      organizationName,
      viewerEmail,
    );
  }

  /**
   * Get organizations by domain
   * @param domain - Email domain
   * @returns Promise with organizations list
   */
  async getOrganizationsByDomain(domain: string): Promise<ClientsData[]> {
    return this.clientsDataRepository.findByDomain(domain);
  }

  /**
   * Search organizations
   * @param filters - Search filters
   * @returns Promise with organizations list
   */
  async searchOrganizations(
    filters: OrganizationSearchDto,
  ): Promise<ClientsData[]> {
    return this.clientsDataRepository.searchOrganizations({
      search_term: filters.search_term,
      industry_sector: filters.industry_sector,
      size: filters.size,
      country: filters.country,
      domain: filters.domain,
    });
  }

  /**
   * Get organization statistics
   * @returns Promise with organization stats
   */
  async getOrganizationStats() {
    return this.clientsDataRepository.getOrganizationStats();
  }

  /**
   * Update organization risk score
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @param riskScore - Risk score to set
   */
  async updateRiskScore(
    clientName: string,
    organizationName: string,
    riskScore: number,
  ): Promise<void> {
    await this.clientsDataRepository.updateRiskScore(
      clientName,
      organizationName,
      riskScore,
    );
  }

  /**
   * Update organization maturity score
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @param maturityScore - Maturity score to set
   */
  async updateMaturityScore(
    clientName: string,
    organizationName: string,
    maturityScore: number,
  ): Promise<void> {
    await this.clientsDataRepository.updateMaturityScore(
      clientName,
      organizationName,
      maturityScore,
    );
  }

  /**
   * Check if user has access to organization
   * @param userEmail - User email
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @returns Promise with access permission
   */
  async canUserAccessOrganization(
    userEmail: string,
    clientName: string,
    organizationName: string,
  ): Promise<boolean> {
    const organization = await this.clientsDataRepository.findByClientAndOrganization(
      clientName,
      organizationName,
    );

    if (!organization) {
      return false;
    }

    return (
      organization.admins.includes(userEmail) ||
      organization.viewers.includes(userEmail)
    );
  }

  /**
   * Get user role in organization
   * @param userEmail - User email
   * @param clientName - Client name
   * @param organizationName - Organization name
   * @returns Promise with user role or null
   */
  async getUserRoleInOrganization(
    userEmail: string,
    clientName: string,
    organizationName: string,
  ): Promise<'admin' | 'viewer' | null> {
    const organization = await this.clientsDataRepository.findByClientAndOrganization(
      clientName,
      organizationName,
    );

    if (!organization) {
      return null;
    }

    if (organization.admins.includes(userEmail)) {
      return 'admin';
    }

    if (organization.viewers.includes(userEmail)) {
      return 'viewer';
    }

    return null;
  }
}
