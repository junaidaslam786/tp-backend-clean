import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  RoleBasedOnboardingService,
  RoleBasedRegistrationDto,
} from '../services/role-based-onboarding.service';
import {
  AssignAdminToOrganizationDto,
  RoleBasedOnboardingResponseDto,
} from '../dto/role-based-registration.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole as CommonUserRole } from '../../../common/enums/user-role.enum';

@ApiTags('Role-Based Onboarding')
@Controller('auth/role-onboarding')
export class RoleOnboardingController {
  constructor(
    private readonly roleBasedOnboardingService: RoleBasedOnboardingService,
  ) {}

  @Post('complete')
  @ApiOperation({
    summary: 'Complete role-based registration after Cognito auth',
    description:
      'Automatically determines user type based on email domain and Cognito groups, then routes to appropriate registration flow.',
  })
  @HttpCode(HttpStatus.OK)
  async completeRoleBasedRegistration(
    @Body() registrationDto: RoleBasedRegistrationDto,
  ): Promise<RoleBasedOnboardingResponseDto> {
    return this.roleBasedOnboardingService.completeRoleBasedRegistration(
      registrationDto,
    );
  }

  @Post('assign-admin/:userEmail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(CommonUserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign pending organization admin to organization',
    description:
      'Platform admins can assign pending organization admins to specific organizations.',
  })
  async assignPendingAdminToOrganization(
    @Param('userEmail') userEmail: string,
    @Body() body: AssignAdminToOrganizationDto,
    @Request() req: any,
  ) {
    return this.roleBasedOnboardingService.assignPendingAdminToOrganization(
      userEmail,
      body.clientName,
      body.organizationName,
      req.user.email,
    );
  }

  @Get('pending-admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(CommonUserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all pending organization admins',
    description:
      'Retrieves a list of all organization admins who are pending assignment to organizations.',
  })
  async getPendingOrganizationAdmins() {
    return this.roleBasedOnboardingService.getPendingOrganizationAdmins();
  }
}
