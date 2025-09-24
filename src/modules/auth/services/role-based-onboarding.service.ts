import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnboardingService, CompleteRegistrationDto, OnboardingResult } from './onboarding.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { ClientsDataRepository } from '../../organizations/repositories/clients-data.repository';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { AuditRepository } from '../../../core/database/repositories/audit.repository';
import {
  User,
  UserStatus,
  UserRole,
} from '../../users/interfaces/user.interface';
import { AuditAction, AuditType } from '../../../common/enums/audit.enum';

export interface RoleBasedRegistrationDto extends CompleteRegistrationDto {
  cognitoGroups?: string[];
  cognitoUsername?: string;
}

export interface RoleBasedOnboardingResult extends OnboardingResult {
  userType: 'platform_admin' | 'organization_admin' | 'viewer';
  requiresOrganization: boolean;
  availableOrganizations?: Array<{ clientName: string; organizationName: string }>;
}

/**
 * Role-Based Onboarding Service
 * Handles registration flow based on user domain and Cognito groups
 */
@Injectable()
export class RoleBasedOnboardingService {
  private readonly logger = new Logger(RoleBasedOnboardingService.name);
  private platformAdminDomains: string[] = [];
  private adminDomains: string[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly onboardingService: OnboardingService,
    private readonly userRepository: UserRepository,
    private readonly clientsDataRepository: ClientsDataRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly auditRepository: AuditRepository,
  ) {
    // Load domain configurations
    this.platformAdminDomains = this.configService.get<string[]>('auth.platformAdminDomains') || 
      ['yourdomain.com', 'admin.yourdomain.com']; // Configure these in your config
    this.adminDomains = this.configService.get<string[]>('auth.adminDomains') || [];
  }

  /**
   * Complete role-based registration after Cognito authentication
   */
  async completeRoleBasedRegistration(
    data: RoleBasedRegistrationDto,
  ): Promise<RoleBasedOnboardingResult> {
    this.logger.log('Starting role-based registration completion', {
      email: data.email,
      cognitoGroups: data.cognitoGroups,
      organizationName: data.organizationName,
    });

    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser?.status === UserStatus.ACTIVE) {
      throw new ConflictException('User account already exists and is active');
    }

    // 2. Determine user type based on domain and Cognito groups
    const userType = this.determineUserType(data);
    
    // 3. Route to appropriate registration flow
    switch (userType) {
      case 'platform_admin':
        return this.registerPlatformAdmin(data);
      case 'organization_admin':
        return this.registerOrganizationAdmin(data);
      case 'viewer':
        return this.registerViewer(data);
      default:
        throw new BadRequestException('Unable to determine user type');
    }
  }

  /**
   * Determine user type based on email domain and Cognito groups
   */
  private determineUserType(data: RoleBasedRegistrationDto): 'platform_admin' | 'organization_admin' | 'viewer' {
    const emailDomain = data.email.split('@')[1].toLowerCase();
    const cognitoGroups = data.cognitoGroups || [];

    // Check Cognito groups first (highest priority)
    if (cognitoGroups.includes('PLATFORM_ADMIN') || cognitoGroups.includes('platform_admin')) {
      return 'platform_admin';
    }

    if (cognitoGroups.includes('ORG_ADMIN') || cognitoGroups.includes('organization_admin')) {
      return 'organization_admin';
    }

    // Check domain-based rules
    if (this.platformAdminDomains.includes(emailDomain)) {
      return 'platform_admin';
    }

    if (this.adminDomains.includes(emailDomain)) {
      return 'organization_admin';
    }

    // Check if user has requested admin role
    if (data.requestedRole === UserRole.ADMIN) {
      return 'organization_admin';
    }

    // Default to viewer
    return 'viewer';
  }

  /**
   * Register platform admin - no organization required
   */
  private async registerPlatformAdmin(
    data: RoleBasedRegistrationDto,
  ): Promise<RoleBasedOnboardingResult> {
    this.logger.log('Registering platform admin', { email: data.email });

    const user = await this.userRepository.createUser({
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber || '',
      role: UserRole.PLATFORM_ADMIN,
      partner_referral_code: data.partnerReferralCode,
      organization_name: 'Platform', // Special organization for platform admins
      org_domain: data.email.split('@')[1],
      origin_country: 'US', // Default or get from config
      operating_countries: ['Global'],
      government: 'no',
      industry_sector: 'Platform Administration',
    });

    // Update status to active immediately for platform admins
    const activeUser = await this.userRepository.updateUser(user.email, {
      status: UserStatus.ACTIVE,
    });

    await this.logAuditEvent(
      AuditAction.USER_REGISTERED,
      AuditType.USER_MANAGEMENT,
      data.email,
      {
        userType: 'platform_admin',
        cognitoGroups: data.cognitoGroups,
        requiresOrganization: false,
      },
    );

    return {
      user: activeUser,
      userType: 'platform_admin',
      requiresOrganization: false,
      needsApproval: false,
      message: 'Platform admin registered successfully. Full system access granted.',
    };
  }

  /**
   * Register organization admin - requires organization assignment
   */
  private async registerOrganizationAdmin(
    data: RoleBasedRegistrationDto,
  ): Promise<RoleBasedOnboardingResult> {
    this.logger.log('Registering organization admin', { email: data.email });

    const emailDomain = data.email.split('@')[1].toLowerCase();

    // Find matching organizations
    let matchingOrganizations = await this.organizationsService.getOrganizationsByDomain(emailDomain);

    // If specific organization requested, validate it
    if (data.organizationName && data.clientName) {
      try {
        const specificOrg = await this.organizationsService.getOrganization(
          data.clientName,
          data.organizationName,
        );
        if (specificOrg.org_domain === emailDomain) {
          matchingOrganizations = [specificOrg];
        }
      } catch (error) {
        this.logger.warn('Requested organization not found or domain mismatch', {
          email: data.email,
          organizationName: data.organizationName,
          clientName: data.clientName,
        });
      }
    }

    if (matchingOrganizations.length === 0) {
      // No matching organizations - create pending admin
      return this.createPendingOrganizationAdmin(data);
    } else if (matchingOrganizations.length === 1) {
      // Single organization - assign directly
      return this.assignAdminToOrganization(data, matchingOrganizations[0]);
    } else {
      // Multiple organizations - require selection
      return this.handleMultipleOrganizationsForAdmin(data, matchingOrganizations);
    }
  }

  /**
   * Register viewer - uses existing onboarding service
   */
  private async registerViewer(
    data: RoleBasedRegistrationDto,
  ): Promise<RoleBasedOnboardingResult> {
    this.logger.log('Registering viewer', { email: data.email });

    // Use existing onboarding service for viewers
    const result = await this.onboardingService.completeRegistration(data);

    return {
      ...result,
      userType: 'viewer',
      requiresOrganization: true,
    };
  }

  /**
   * Create pending organization admin when no organizations match
   */
  private async createPendingOrganizationAdmin(
    data: RoleBasedRegistrationDto,
  ): Promise<RoleBasedOnboardingResult> {
    const user = await this.userRepository.createUser({
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber || '',
      role: UserRole.ADMIN,
      partner_referral_code: data.partnerReferralCode,
      organization_name: data.organizationName || 'Pending Organization',
      org_domain: data.email.split('@')[1],
      origin_country: 'US',
      operating_countries: ['US'],
      government: 'no',
      industry_sector: 'Unknown',
    });

    await this.logAuditEvent(
      AuditAction.USER_REGISTERED,
      AuditType.USER_MANAGEMENT,
      data.email,
      {
        userType: 'organization_admin',
        requiresOrganization: true,
        status: 'pending_organization_assignment',
      },
    );

    return {
      user,
      userType: 'organization_admin',
      requiresOrganization: true,
      needsApproval: true,
      message: 'Organization admin registered. Pending organization assignment by platform admin.',
    };
  }

  /**
   * Assign admin to single matching organization
   */
  private async assignAdminToOrganization(
    data: RoleBasedRegistrationDto,
    organization: any,
  ): Promise<RoleBasedOnboardingResult> {
    const user = await this.userRepository.createUser({
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber || '',
      role: UserRole.ADMIN,
      partner_referral_code: data.partnerReferralCode,
      organization_name: organization.organization_name,
      org_domain: organization.org_domain,
      origin_country: organization.origin_country,
      operating_countries: organization.operating_countries,
      government: organization.government,
      industry_sector: organization.industry_sector,
    });

    // Update status to active immediately for auto-assigned admins
    const activeUser = await this.userRepository.updateUser(user.email, {
      status: UserStatus.ACTIVE,
    });

    // Add user as admin to organization
    await this.organizationsService.addAdmin(
      organization.client_name,
      organization.organization_name,
      data.email,
    );

    await this.logAuditEvent(
      AuditAction.USER_REGISTERED,
      AuditType.USER_MANAGEMENT,
      data.email,
      {
        userType: 'organization_admin',
        organizationName: organization.organization_name,
        clientName: organization.client_name,
        autoAssigned: true,
      },
    );

    return {
      user: activeUser,
      organization,
      userType: 'organization_admin',
      requiresOrganization: true,
      needsApproval: false,
      message: 'Organization admin registered and assigned to organization successfully.',
    };
  }

  /**
   * Handle multiple organizations for admin
   */
  private async handleMultipleOrganizationsForAdmin(
    data: RoleBasedRegistrationDto,
    organizations: any[],
  ): Promise<RoleBasedOnboardingResult> {
    const user = await this.userRepository.createUser({
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber || '',
      role: UserRole.ADMIN,
      partner_referral_code: data.partnerReferralCode,
      organization_name: 'Multiple Available',
      org_domain: data.email.split('@')[1],
      origin_country: 'US',
      operating_countries: ['US'],
      government: 'no',
      industry_sector: 'Multiple',
    });

    const availableOrganizations = organizations.map(org => ({
      clientName: org.client_name,
      organizationName: org.organization_name,
    }));

    await this.logAuditEvent(
      AuditAction.USER_REGISTERED,
      AuditType.USER_MANAGEMENT,
      data.email,
      {
        userType: 'organization_admin',
        availableOrganizations: availableOrganizations.length,
        requiresSelection: true,
      },
    );

    return {
      user,
      userType: 'organization_admin',
      requiresOrganization: true,
      availableOrganizations,
      needsApproval: true,
      message: 'Organization admin registered. Please select an organization or await platform admin assignment.',
    };
  }

  /**
   * Assign pending admin to specific organization (called by platform admin)
   */
  async assignPendingAdminToOrganization(
    userEmail: string,
    clientName: string,
    organizationName: string,
    assigningAdminEmail: string,
  ): Promise<User> {
    // Validate assigning admin is platform admin
    const assigningAdmin = await this.userRepository.findByEmail(assigningAdminEmail);
    if (!assigningAdmin || assigningAdmin.role !== UserRole.PLATFORM_ADMIN) {
      throw new BadRequestException('Only platform admins can assign organization admins');
    }

    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.ADMIN || user.status !== UserStatus.PENDING_APPROVAL) {
      throw new BadRequestException('User is not a pending organization admin');
    }

    const organization = await this.clientsDataRepository.findByClientAndOrganization(
      clientName,
      organizationName,
    );
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Update user status and organization
    const updatedUser = await this.userRepository.updateUser(userEmail, {
      status: UserStatus.ACTIVE,
      organization_name: organizationName,
      org_domain: organization.org_domain,
      origin_country: organization.origin_country,
      operating_countries: organization.operating_countries,
      government: organization.government,
      industry_sector: organization.industry_sector,
    });

    // Add user as admin to organization
    await this.organizationsService.addAdmin(clientName, organizationName, userEmail);

    await this.logAuditEvent(
      AuditAction.USER_APPROVED,
      AuditType.USER_MANAGEMENT,
      userEmail,
      {
        assignedBy: assigningAdminEmail,
        organizationName,
        clientName,
        role: 'organization_admin',
      },
    );

    return updatedUser;
  }

  /**
   * Get pending organization admins (for platform admin dashboard)
   */
  async getPendingOrganizationAdmins(): Promise<User[]> {
    const pendingUsers = await this.userRepository.findByStatus(UserStatus.PENDING_APPROVAL);
    return pendingUsers.filter(user => user.role === UserRole.ADMIN);
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    action: AuditAction,
    type: AuditType,
    userId: string,
    details: any,
  ): Promise<void> {
    try {
      await this.auditRepository.logEvent(action, type, details, userId);
    } catch (error) {
      this.logger.error('Failed to log audit event', {
        error: error.message,
        action,
        userId,
      });
    }
  }
}
