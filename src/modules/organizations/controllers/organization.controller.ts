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
import { OrganizationService } from '../services/organization.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserRole as InterfaceUserRole } from '../../users/interfaces/user.interface';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationSearchDto,
  AddUserToOrganizationDto,
  ChangeUserRoleInOrganizationDto,
} from '../dto/organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @Body() createOrgDto: CreateOrganizationDto,
    @Request() req: any,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.createOrganization(createOrgDto, req.user);
  }

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  async getOrganizations(
    @Query() searchDto: OrganizationSearchDto,
    @Request() req: any,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationService.searchOrganizations(searchDto, req.user);
  }

  @Get(':clientName/:organizationName')
  async getOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Request() req: any,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.findByClientAndOrganization(
      clientName,
      organizationName,
      req.user,
    );
  }

  @Put(':clientName/:organizationName')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  async updateOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Body() updateOrgDto: UpdateOrganizationDto,
    @Request() req: any,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.updateOrganization(
      clientName,
      organizationName,
      updateOrgDto,
      req.user,
    );
  }

  @Post(':clientName/:organizationName/users')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async addUserToOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Body() addUserDto: AddUserToOrganizationDto,
    @Request() req: any,
  ): Promise<void> {
    // Map string role to UserRole enum
    const roleMapping: { [key: string]: InterfaceUserRole } = {
      admin: InterfaceUserRole.ADMIN,
      viewer: InterfaceUserRole.VIEWER,
    };

    await this.organizationService.addUserToOrganization(
      clientName,
      organizationName,
      addUserDto.userEmail,
      roleMapping[addUserDto.role],
      req.user,
    );
  }

  @Put(':clientName/:organizationName/users/:userEmail/role')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeUserRole(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Param('userEmail') userEmail: string,
    @Body() changeRoleDto: ChangeUserRoleInOrganizationDto,
    @Request() req: any,
  ): Promise<void> {
    // Map string role to UserRole enum
    const roleMapping: { [key: string]: InterfaceUserRole } = {
      admin: InterfaceUserRole.ADMIN,
      viewer: InterfaceUserRole.VIEWER,
    };

    await this.organizationService.changeUserRole(
      clientName,
      organizationName,
      userEmail,
      roleMapping[changeRoleDto.newRole],
      req.user,
    );
  }

  @Delete(':clientName/:organizationName/users/:userEmail')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUserFromOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Param('userEmail') userEmail: string,
    @Request() req: any,
  ): Promise<void> {
    await this.organizationService.removeUserFromOrganization(
      clientName,
      organizationName,
      userEmail,
      req.user,
    );
  }

  @Delete(':clientName/:organizationName')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Request() req: any,
  ): Promise<void> {
    await this.organizationService.deleteOrganization(
      clientName,
      organizationName,
      req.user,
    );
  }

  @Get(':clientName/:organizationName/users')
  async getOrganizationUsers(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Request() req: any,
  ): Promise<{
    admins: string[];
    viewers: string[];
  }> {
    const organization =
      await this.organizationService.findByClientAndOrganization(
        clientName,
        organizationName,
        req.user,
      );
    return {
      admins: organization.admins,
      viewers: organization.viewers,
    };
  }
}
