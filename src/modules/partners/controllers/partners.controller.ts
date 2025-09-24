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
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PartnersService } from '../services/partners.service';
import { CreatePartnerDto, UpdatePartnerDto, PartnerCodeDto } from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';
import { UserRole } from '../../../common/enums';
import { BaseResponseDto, SuccessResponseDto } from '../../../common/dto';

@ApiTags('partners')
@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersController {
  private readonly logger = new Logger(PartnersController.name);

  constructor(private readonly partnersService: PartnersService) {}

  /**
   * Partner Registration and Management
   */

  @Post()
  @ApiOperation({ summary: 'Create new partner' })
  @ApiResponse({ status: 201, description: 'Partner created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid partner data' })
  @ApiResponse({ status: 409, description: 'Partner already exists' })
  async createPartner(
    @Body() createPartnerDto: CreatePartnerDto,
  ) {
    this.logger.log(`Creating new partner: ${createPartnerDto.companyName}`);
    const partner = await this.partnersService.createPartner(createPartnerDto);
    return {
      success: true,
      message: 'Partner created successfully',
      data: partner,
    };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all partners (Admin only)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'businessType', required: false, description: 'Filter by business type' })
  @ApiResponse({ status: 200, description: 'Partners retrieved successfully' })
  async getAllPartners(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
    @Query('businessType') businessType?: string,
  ) {
    const partners = await this.partnersService.listPartners(limit, page * limit - limit);
    return {
      success: true,
      message: 'Partners retrieved successfully',
      data: partners,
    };
  }

  @Get(':partnerId')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getPartner(@Param('partnerId') partnerId: string) {
    const partner = await this.partnersService.getPartnerById(partnerId);
    return {
      success: true,
      message: 'Partner retrieved successfully',
      data: partner,
    };
  }

  @Put(':partnerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update partner (Admin only)' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner updated successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async updatePartner(
    @Param('partnerId') partnerId: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    this.logger.log(`Updating partner: ${partnerId}`);
    const partner = await this.partnersService.updatePartner(partnerId, updatePartnerDto);
    return {
      success: true,
      message: 'Partner updated successfully',
      data: partner,
    };
  }

  @Delete(':partnerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete partner (Admin only)' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 204, description: 'Partner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async deletePartner(@Param('partnerId') partnerId: string): Promise<void> {
    this.logger.log(`Deleting partner: ${partnerId}`);
    await this.partnersService.deletePartner(partnerId);
  }

  /**
   * Partner Code Management
   */

  @Post(':partnerId/codes')
  @ApiOperation({ summary: 'Create partner referral code' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 201, description: 'Partner code created successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async createPartnerCode(
    @Param('partnerId') partnerId: string,
    @Body() codeData: { maxUses?: number; expiresAt?: string },
  ) {
    this.logger.log(`Creating code for partner: ${partnerId}`);
    const code = await this.partnersService.createPartnerCode(partnerId, codeData);
    return {
      success: true,
      message: 'Partner code created successfully',
      data: code,
    };
  }

  @Get(':partnerId/codes')
  @ApiOperation({ summary: 'Get partner referral codes' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner codes retrieved successfully' })
  async getPartnerCodes(@Param('partnerId') partnerId: string) {
    const codes = await this.partnersService.getPartnerCodes(partnerId);
    return {
      success: true,
      message: 'Partner codes retrieved successfully',
      data: codes,
    };
  }

  /**
   * Partner Analytics and Commission
   */

  @Get(':partnerId/analytics')
  @ApiOperation({ summary: 'Get partner analytics and performance metrics' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics (ISO string)' })
  @ApiResponse({ status: 200, description: 'Partner analytics retrieved successfully' })
  async getPartnerAnalytics(
    @Param('partnerId') partnerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const analytics = await this.partnersService.getPartnerAnalytics(partnerId, startDate, endDate);
    return {
      success: true,
      message: 'Partner analytics retrieved successfully',
      data: analytics,
    };
  }

  @Post(':partnerId/commission/calculate')
  @ApiOperation({ summary: 'Calculate commission for partner' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Commission calculated successfully' })
  async calculateCommission(
    @Param('partnerId') partnerId: string,
    @Body('subscriptionAmount') subscriptionAmount: number,
  ) {
    const commission = await this.partnersService.calculateCommission(partnerId, subscriptionAmount);
    return {
      success: true,
      message: 'Commission calculated successfully',
      data: { commission, subscriptionAmount },
    };
  }

  /**
   * Partner Onboarding and Support
   */

  @Get(':partnerId/onboarding')
  @ApiOperation({ summary: 'Get partner onboarding status' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Onboarding status retrieved successfully' })
  async getOnboardingStatus(@Param('partnerId') partnerId: string) {
    const status = await this.partnersService.getOnboardingStatus(partnerId);
    return {
      success: true,
      message: 'Onboarding status retrieved successfully',
      data: status,
    };
  }

  /**
   * Partner Status Management (Admin endpoints)
   */

  @Put(':partnerId/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update partner status (Admin only)' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner status updated successfully' })
  async updatePartnerStatus(
    @Param('partnerId') partnerId: string,
    @Body() body: { status: string },
  ) {
    this.logger.log(`Updating partner ${partnerId} status to: ${body.status}`);
    const updateData: UpdatePartnerDto = { status: body.status as any };
    const partner = await this.partnersService.updatePartner(partnerId, updateData);
    return {
      success: true,
      message: 'Partner status updated successfully',
      data: partner,
    };
  }

  @Get('codes/:code/validate')
  @ApiOperation({ summary: 'Validate partner code publicly' })
  @ApiParam({ name: 'code', description: 'Partner referral code' })
  @ApiResponse({ status: 200, description: 'Partner code validation result' })
  async validatePartnerCode(@Param('code') code: string) {
    const result = await this.partnersService.validatePartnerCode(code);
    return {
      success: true,
      message: 'Partner code validation completed',
      data: result,
    };
  }
}
