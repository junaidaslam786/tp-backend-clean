import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { SubscriptionAdminService, SubscriptionOverrideDto, SubscriptionStatsDto } from '../services/subscription-admin.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ClientSubs } from '../../subscriptions/interfaces';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '../../users/dto/user.dto';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationSearchDto,
} from '../../organizations/dto/organization.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly subscriptionAdminService: SubscriptionAdminService,
  ) {}

  // User Management Endpoints
  @Get('users')
  async getAllUsers(@Request() req: any): Promise<UserResponseDto[]> {
    return this.adminService.getAllUsers(req.user);
  }

  @Get('users/:email')
  async getUserById(
    @Param('email') email: string,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    return this.adminService.getUserById(email, req.user);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async createUserAsAdmin(
    @Body() createUserDto: CreateUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    return this.adminService.createUserAsAdmin(createUserDto, req.user);
  }

  @Put('users/:email')
  async updateUserAsAdmin(
    @Param('email') email: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    return this.adminService.updateUserAsAdmin(email, updateUserDto, req.user);
  }

  @Put('users/:email/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspendUser(
    @Param('email') email: string,
    @Request() req: any,
  ): Promise<void> {
    await this.adminService.suspendUser(email, req.user);
  }

  @Put('users/:email/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async activateUser(
    @Param('email') email: string,
    @Request() req: any,
  ): Promise<void> {
    await this.adminService.activateUser(email, req.user);
  }

  @Delete('users/:email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('email') email: string,
    @Request() req: any,
  ): Promise<void> {
    await this.adminService.deleteUser(email, req.user);
  }

  // Organization Management Endpoints
  @Get('organizations')
  async getAllOrganizations(
    @Query() filters: OrganizationSearchDto,
    @Request() req: any,
  ): Promise<OrganizationResponseDto[]> {
    return this.adminService.getAllOrganizations(req.user, filters);
  }

  @Post('organizations')
  @HttpCode(HttpStatus.CREATED)
  async createOrganizationAsAdmin(
    @Body() createOrgDto: CreateOrganizationDto,
    @Request() req: any,
  ): Promise<OrganizationResponseDto> {
    return this.adminService.createOrganizationAsAdmin(createOrgDto, req.user);
  }

  @Put('organizations/:clientName/:organizationName')
  async updateOrganizationAsAdmin(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Body() updateOrgDto: UpdateOrganizationDto,
    @Request() req: any,
  ): Promise<OrganizationResponseDto> {
    return this.adminService.updateOrganizationAsAdmin(
      clientName,
      organizationName,
      updateOrgDto,
      req.user,
    );
  }

  @Delete('organizations/:clientName/:organizationName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganizationAsAdmin(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Request() req: any,
  ): Promise<void> {
    await this.adminService.deleteOrganizationAsAdmin(
      clientName,
      organizationName,
      req.user,
    );
  }

  // Cross-Organization User Management
  @Post('organizations/:clientName/:organizationName/users/:userEmail')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignUserToOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Param('userEmail') userEmail: string,
    @Body() body: { role: 'admin' | 'viewer' },
    @Request() req: any,
  ): Promise<void> {
    await this.adminService.assignUserToOrganization(
      userEmail,
      clientName,
      organizationName,
      body.role as any,
      req.user,
    );
  }

  @Delete('organizations/:clientName/:organizationName/users/:userEmail')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUserFromOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Param('userEmail') userEmail: string,
    @Request() req: any,
  ): Promise<void> {
    await this.adminService.removeUserFromOrganization(
      userEmail,
      clientName,
      organizationName,
      req.user,
    );
  }

  // System Statistics
  @Get('statistics')
  async getSystemStatistics(@Request() req: any): Promise<{
    totalUsers: number;
    totalOrganizations: number;
    activeUsers: number;
    suspendedUsers: number;
    usersByRole: Record<string, number>;
    organizationsByIndustry: Record<string, number>;
  }> {
    return this.adminService.getSystemStatistics(req.user);
  }

  // Subscription Admin Endpoints
  @Post('subscriptions/override')
  @HttpCode(HttpStatus.CREATED)
  async overrideSubscriptionTier(
    @Body() overrideDto: SubscriptionOverrideDto,
    @Request() req: any,
  ): Promise<ClientSubs> {
    return this.subscriptionAdminService.overrideSubscriptionTier(
      overrideDto,
      req.user,
    );
  }

  @Get('subscriptions')
  async getAllSubscriptions(@Request() req: any): Promise<ClientSubs[]> {
    return this.subscriptionAdminService.getAllSubscriptions();
  }

  @Get('subscriptions/stats')
  async getSubscriptionStats(@Request() req: any): Promise<SubscriptionStatsDto> {
    return this.subscriptionAdminService.getSubscriptionStats();
  }

  @Post('subscriptions/:organizationId/force-renewal')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forceSubscriptionRenewal(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ): Promise<void> {
    await this.subscriptionAdminService.forceRenewal(
      organizationId,
      req.user,
    );
  }

  @Post('subscriptions/:organizationId/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspendSubscription(
    @Param('organizationId') organizationId: string,
    @Body() body: { reason: string },
    @Request() req: any,
  ): Promise<void> {
    await this.subscriptionAdminService.suspendSubscription(
      organizationId,
      req.user,
      body.reason,
    );
  }

  @Post('subscriptions/:organizationId/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivateSubscription(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ): Promise<void> {
    await this.subscriptionAdminService.reactivateSubscription(
      organizationId,
      req.user,
    );
  }

  @Get('subscriptions/:organizationId/usage')
  async getOrganizationUsage(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ): Promise<any> {
    return this.subscriptionAdminService.getOrganizationUsage(organizationId);
  }

  @Get('subscriptions/:organizationId/audit')
  async getSubscriptionAuditTrail(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ): Promise<ClientSubs[]> {
    return this.subscriptionAdminService.getSubscriptionAuditTrail(organizationId);
  }
}
