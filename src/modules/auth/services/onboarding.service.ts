import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { PartnersService } from '../../partners/services/partners.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { CreateUserDto } from '../../users/dto/user.dto';
import {
  User,
  UserRole,
  UserStatus,
} from '../../users/interfaces/user.interface';
import { ClientsData } from '../../organizations/interfaces/clients-data.interface';
import { ClientsDataRepository } from '../../organizations/repositories/clients-data.repository';
import { AuditRepository } from '../../../core/database/repositories/audit.repository';
import { AuditAction, AuditType } from '../../../common/enums/audit.enum';

export interface OnboardingResult {
  user: User;
  organization?: ClientsData;
  needsApproval: boolean;
  pendingRequests?: Array<{ organizationName: string; clientName: string }>;
  message: string;
}

export interface CompleteRegistrationDto {
  email: string;
  fullName: string;
  phoneNumber?: string;
  organizationName?: string;
  clientName?: string;
  partnerReferralCode?: string;
  requestedRole?: UserRole;
}

/**
 * Onboarding Service
 * Handles complete user registration and organization association flow
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly partnersService: PartnersService,
    private readonly userRepository: UserRepository,
    private readonly clientsDataRepository: ClientsDataRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  /**
   * Complete user registration after Cognito authentication
   * Handles domain-based organization association and partner referrals
   */
  async completeRegistration(
    data: CompleteRegistrationDto,
  ): Promise<OnboardingResult> {
    this.logger.log('Starting user registration completion', {
      email: data.email,
      organizationName: data.organizationName,
      hasPartnerCode: !!data.partnerReferralCode,
    });

    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      if (existingUser.status === UserStatus.ACTIVE) {
        throw new ConflictException(
          'User account already exists and is active',
        );
      }
      // User exists but not active - continue with activation flow
      return this.activateExistingUser(existingUser, data);
    }

    // 2. Extract domain from email for organization matching
    const emailDomain = data.email.split('@')[1].toLowerCase();

    // 3. Validate partner referral code if provided
    let validatedPartnerCode: string | undefined;
    if (data.partnerReferralCode) {
      validatedPartnerCode = await this.validatePartnerReferralCode(
        data.partnerReferralCode,
      );
    }

    // 4. Find organizations by domain or explicit selection
    const matchingOrganizations = await this.findMatchingOrganizations(
      emailDomain,
      data.organizationName,
      data.clientName,
    );

    // 5. Handle different organization scenarios
    if (matchingOrganizations.length === 0) {
      // No matching organizations - create pending user
      return this.createPendingUser(data, validatedPartnerCode);
    } else if (matchingOrganizations.length === 1) {
      // Single organization match - auto-assign
      return this.assignUserToOrganization(
        data,
        matchingOrganizations[0],
        validatedPartnerCode,
      );
    } else {
      // Multiple organizations - require user selection or admin approval
      return this.handleMultipleOrganizations(
        data,
        matchingOrganizations,
        validatedPartnerCode,
      );
    }
  }

  /**
   * Activate existing user who was previously pending
   */
  private async activateExistingUser(
    existingUser: User,
    data: CompleteRegistrationDto,
  ): Promise<OnboardingResult> {
    // Update user profile with any new information
    const updatedUser = await this.userRepository.updateUser(data.email, {
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      status: UserStatus.ACTIVE,
    });

    await this.logAuditEvent(
      AuditAction.USER_ACTIVATED,
      AuditType.USER_MANAGEMENT,
      data.email,
      { previousStatus: existingUser.status },
    );

    return {
      user: updatedUser,
      needsApproval: false,
      message: 'User account activated successfully',
    };
  }

  /**
   * Validate partner referral code
   */
  private async validatePartnerReferralCode(code: string): Promise<string> {
    const partner = await this.partnersService.findByReferralCode(code);
    if (!partner || partner.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Invalid or inactive partner referral code',
      );
    }

    // Record referral attribution
    await this.partnersService.recordReferralAttribution(code, Date.now());

    return code;
  }

  /**
   * Find organizations that match user's email domain or explicit selection
   */
  private async findMatchingOrganizations(
    emailDomain: string,
    organizationName?: string,
    clientName?: string,
  ): Promise<ClientsData[]> {
    let organizations: ClientsData[] = [];

    // If specific organization requested, find it
    if (organizationName && clientName) {
      try {
        const org = await this.organizationsService.getOrganization(
          clientName,
          organizationName,
        );
        organizations = [org];
      } catch (error) {
        // Organization not found - continue with domain search
      }
    }

    // If no specific organization or not found, search by domain
    if (organizations.length === 0) {
      organizations =
        await this.organizationsService.getOrganizationsByDomain(emailDomain);
    }

    return organizations;
  }

  /**
   * Create pending user when no organizations match
   */
  private async createPendingUser(
    data: CompleteRegistrationDto,
    partnerCode?: string,
  ): Promise<OnboardingResult> {
    const emailDomain = data.email.split('@')[1].toLowerCase();

    const user = await this.userRepository.createUser({
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      role: UserRole.VIEWER, // Default role for pending users
      partner_referral_code: partnerCode,
      organization_name: data.organizationName || 'Pending Organization',
      org_domain: emailDomain,
      origin_country: 'Unknown', // Will be collected later
      operating_countries: ['Unknown'], // Will be collected later
      government: 'no', // Default assumption
      industry_sector: 'Unknown', // Will be collected later
    });

    await this.logAuditEvent(
      AuditAction.USER_REGISTERED,
      AuditType.USER_MANAGEMENT,
      data.email,
      {
        partnerReferred: !!partnerCode,
        organizationRequested: data.organizationName,
      },
    );

    return {
      user,
      needsApproval: true,
      message:
        'Registration completed. Account pending organization assignment.',
    };
  }

  /**
   * Assign user to single matching organization
   */
  private async assignUserToOrganization(
    data: CompleteRegistrationDto,
    organization: ClientsData,
    partnerCode?: string,
  ): Promise<OnboardingResult> {
    // Determine user role based on organization rules
    const assignedRole = this.determineUserRole(data, organization);
    const needsApproval = assignedRole === UserRole.ADMIN;

    const user = await this.userRepository.createUser({
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber || '',
      role: assignedRole,
      partner_referral_code: partnerCode,
      organization_name: organization.organization_name,
      org_domain: organization.org_domain,
      origin_country: organization.origin_country || 'US',
      operating_countries: organization.operating_countries || ['US'],
      government: organization.government || 'no',
      industry_sector: organization.industry_sector || 'Technology',
    });

    // Add user to organization's member lists
    if (assignedRole === UserRole.ADMIN) {
      await this.organizationsService.addAdmin(
        organization.client_name,
        organization.organization_name,
        data.email,
      );
    } else {
      await this.organizationsService.addViewer(
        organization.client_name,
        organization.organization_name,
        data.email,
      );
    }

    await this.logAuditEvent(
      AuditAction.USER_REGISTERED,
      AuditType.USER_MANAGEMENT,
      data.email,
      {
        organizationName: organization.organization_name,
        clientName: organization.client_name,
        assignedRole,
        partnerReferred: !!partnerCode,
        needsApproval,
      },
    );

    return {
      user,
      organization,
      needsApproval,
      message: needsApproval
        ? 'Registration completed. Admin role assignment pending approval.'
        : 'Registration completed and user assigned to organization.',
    };
  }

  /**
   * Handle multiple organization matches
   */
  private async handleMultipleOrganizations(
    data: CompleteRegistrationDto,
    organizations: ClientsData[],
    partnerCode?: string,
  ): Promise<OnboardingResult> {
    // Create pending user with organization requests
    const user = await this.userRepository.createUser({
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber || '',
      role: UserRole.VIEWER,
      partner_referral_code: partnerCode,
      organization_name: 'Multiple Available',
      org_domain: data.email.split('@')[1],
      origin_country: 'US',
      operating_countries: ['US'],
      government: 'no',
      industry_sector: 'Technology',
    });

    const pendingRequests = organizations.map((org) => ({
      organizationName: org.organization_name,
      clientName: org.client_name,
    }));

    await this.logAuditEvent(
      AuditAction.USER_REGISTERED,
      AuditType.USER_MANAGEMENT,
      data.email,
      {
        multipleOrganizations: organizations.length,
        partnerReferred: !!partnerCode,
      },
    );

    return {
      user,
      needsApproval: true,
      pendingRequests,
      message:
        'Registration completed. Multiple organizations available - please select one.',
    };
  }

  /**
   * Determine appropriate user role based on request and organization rules
   */
  private determineUserRole(
    data: CompleteRegistrationDto,
    organization: ClientsData,
  ): UserRole {
    // If specific role requested and it's admin, it needs approval
    if (data.requestedRole === UserRole.ADMIN) {
      return UserRole.ADMIN; // Will be marked as needs approval
    }

    // If user email is in organization's admin list, assign admin role
    if (organization.admins.includes(data.email)) {
      return UserRole.ADMIN;
    }

    // If user email is in organization's viewer list, assign viewer role
    if (organization.viewers.includes(data.email)) {
      return UserRole.VIEWER;
    }

    // Default to viewer role
    return UserRole.VIEWER;
  }

  /**
   * Approve pending user and assign to organization
   */
  async approvePendingUser(
    adminEmail: string,
    userEmail: string,
    organizationName: string,
    clientName: string,
    assignedRole: UserRole = UserRole.VIEWER,
  ): Promise<User> {
    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING_APPROVAL) {
      throw new BadRequestException('User is not pending approval');
    }

    // Validate admin has permission to approve for this organization
    const canApprove =
      await this.organizationsService.canUserAccessOrganization(
        adminEmail,
        clientName,
        organizationName,
      );
    if (!canApprove) {
      throw new BadRequestException(
        'Admin does not have access to this organization',
      );
    }

    // Update user status and organization
    const approvedUser = await this.userRepository.updateUser(userEmail, {
      status: UserStatus.ACTIVE,
      role: assignedRole,
    });

    // Add user to organization
    await this.userRepository.addUserToOrganization(
      userEmail,
      organizationName,
    );

    if (assignedRole === UserRole.ADMIN) {
      await this.organizationsService.addAdmin(
        clientName,
        organizationName,
        userEmail,
      );
    } else {
      await this.organizationsService.addViewer(
        clientName,
        organizationName,
        userEmail,
      );
    }

    await this.logAuditEvent(
      AuditAction.USER_APPROVED,
      AuditType.USER_MANAGEMENT,
      userEmail,
      {
        approvedBy: adminEmail,
        organizationName,
        clientName,
        assignedRole,
      },
    );

    return approvedUser;
  }

  /**
   * Reject pending user registration
   */
  async rejectPendingUser(
    adminEmail: string,
    userEmail: string,
    reason: string,
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING_APPROVAL) {
      throw new BadRequestException('User is not pending approval');
    }

    // Update user status to suspended with reason
    await this.userRepository.updateUser(userEmail, {
      status: UserStatus.SUSPENDED,
    });

    await this.logAuditEvent(
      AuditAction.USER_REJECTED,
      AuditType.USER_MANAGEMENT,
      userEmail,
      {
        rejectedBy: adminEmail,
        reason,
      },
    );
  }

  /**
   * Get all pending user registrations (for admin dashboard)
   */
  async getPendingRegistrations(): Promise<User[]> {
    return this.userRepository.findByStatus(UserStatus.PENDING_APPROVAL);
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
