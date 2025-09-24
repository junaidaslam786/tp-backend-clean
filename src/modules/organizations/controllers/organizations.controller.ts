import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationsService } from '../services/organizations.service';
import { ClientsData } from '../interfaces/clients-data.interface';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationSearchDto,
} from '../dto/organization.dto';

/**
 * Organizations Controller
 * REST API endpoints for organization management operations
 */
@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Create new organization
   * POST /organizations
   */
  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  async createOrganization(
    @Body() createData: CreateOrganizationDto,
  ): Promise<ClientsData> {
    return this.organizationsService.createOrganization(createData);
  }

  /**
   * Get organization by client and organization name
   * GET /organizations/:clientName/:organizationName
   */
  @Get(':clientName/:organizationName')
  @ApiOperation({ summary: 'Get organization by client and organization name' })
  async getOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
  ): Promise<ClientsData> {
    return this.organizationsService.getOrganization(
      clientName,
      organizationName,
    );
  }

  /**
   * Update organization
   * PUT /organizations/:clientName/:organizationName
   */
  @Put(':clientName/:organizationName')
  @ApiOperation({ summary: 'Update organization' })
  async updateOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Body() updateData: UpdateOrganizationDto,
  ): Promise<ClientsData> {
    return this.organizationsService.updateOrganization(
      clientName,
      organizationName,
      updateData,
    );
  }

  /**
   * Delete organization
   * DELETE /organizations/:clientName/:organizationName
   */
  @Delete(':clientName/:organizationName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization' })
  async deleteOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
  ): Promise<void> {
    return this.organizationsService.deleteOrganization(
      clientName,
      organizationName,
    );
  }

  /**
   * Get organizations by client
   * GET /organizations/client/:clientName
   */
  @Get('client/:clientName')
  @ApiOperation({ summary: 'Get organizations by client name' })
  async getOrganizationsByClient(
    @Param('clientName') clientName: string,
  ): Promise<ClientsData[]> {
    return this.organizationsService.getOrganizationsByClient(clientName);
  }

  /**
   * Search organizations
   * GET /organizations/search
   */
  @Get('search')
  @ApiOperation({ summary: 'Search organizations' })
  async searchOrganizations(
    @Query() searchDto: OrganizationSearchDto,
  ): Promise<ClientsData[]> {
    return this.organizationsService.searchOrganizations(searchDto);
  }

  /**
   * Get organization statistics
   * GET /organizations/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get organization statistics' })
  async getOrganizationStats() {
    return this.organizationsService.getOrganizationStats();
  }

  /**
   * Add admin to organization
   * POST /organizations/:clientName/:organizationName/admins
   */
  @Post(':clientName/:organizationName/admins')
  @ApiOperation({ summary: 'Add admin to organization' })
  async addAdmin(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Body() body: { adminEmail: string },
  ): Promise<ClientsData> {
    return this.organizationsService.addAdmin(
      clientName,
      organizationName,
      body.adminEmail,
    );
  }

  /**
   * Remove admin from organization
   * DELETE /organizations/:clientName/:organizationName/admins/:adminEmail
   */
  @Delete(':clientName/:organizationName/admins/:adminEmail')
  @ApiOperation({ summary: 'Remove admin from organization' })
  async removeAdmin(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Param('adminEmail') adminEmail: string,
  ): Promise<ClientsData> {
    return this.organizationsService.removeAdmin(
      clientName,
      organizationName,
      adminEmail,
    );
  }

  /**
   * Check if user can access organization
   * GET /organizations/:clientName/:organizationName/access/:userEmail
   */
  @Get(':clientName/:organizationName/access/:userEmail')
  @ApiOperation({ summary: 'Check user access to organization' })
  async canUserAccessOrganization(
    @Param('clientName') clientName: string,
    @Param('organizationName') organizationName: string,
    @Param('userEmail') userEmail: string,
  ): Promise<{ hasAccess: boolean }> {
    const hasAccess = await this.organizationsService.canUserAccessOrganization(
      userEmail,
      clientName,
      organizationName,
    );
    return { hasAccess };
  }
}
