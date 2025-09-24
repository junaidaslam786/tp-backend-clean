import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards';
import { SubscriptionsService } from '../services/subscriptions.service';
import { 
  CreateSubscriptionDto, 
  UpgradeSubscriptionDto,
  SubscriptionDto,
  SubscriptionTierDto
} from '../dto';
import { ClientSubs, SubscriptionTierConfig } from '../interfaces';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('tiers')
  @ApiOperation({ summary: 'Get available subscription tiers (L1/L2/L3/LE)' })
  @ApiOkResponse({
    description: 'Available subscription tiers retrieved successfully',
    type: [SubscriptionTierDto],
  })
  async getAvailableTiers(): Promise<{
    success: boolean;
    data: SubscriptionTierConfig[];
  }> {
    const tiers = await this.subscriptionsService.getAvailableTiers();
    return {
      success: true,
      data: tiers,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new subscription' })
  @ApiCreatedResponse({
    description: 'Subscription created successfully',
    type: SubscriptionDto,
  })
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<{ success: boolean; data: ClientSubs }> {
    const subscription = await this.subscriptionsService.createSubscription(
      createSubscriptionDto,
    );
    return {
      success: true,
      data: subscription,
    };
  }

  @Get(':clientName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription by client name' })
  @ApiParam({ name: 'clientName', description: 'Client organization name' })
  @ApiOkResponse({
    description: 'Subscription retrieved successfully',
    type: SubscriptionDto,
  })
  async getSubscription(
    @Param('clientName') clientName: string,
  ): Promise<{ success: boolean; data: ClientSubs | null }> {
    const subscription = await this.subscriptionsService.getSubscriptionByClientName(
      clientName,
    );
    return {
      success: true,
      data: subscription,
    };
  }

  @Post(':clientName/upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upgrade subscription tier' })
  @ApiParam({ name: 'clientName', description: 'Client organization name' })
  @ApiOkResponse({
    description: 'Upgrade initiated successfully',
  })
  async upgradeSubscription(
    @Param('clientName') clientName: string,
    @Body() upgradeDto: UpgradeSubscriptionDto,
  ): Promise<{
    success: boolean;
    message: string;
    requiresPayment: boolean;
  }> {
    const result = await this.subscriptionsService.upgradeSubscription(
      clientName,
      upgradeDto,
    );
    return result;
  }

  @Put(':clientName/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription progress' })
  @ApiParam({ name: 'clientName', description: 'Client organization name' })
  @ApiOkResponse({ description: 'Progress updated successfully' })
  async updateProgress(
    @Param('clientName') clientName: string,
    @Body() body: { progress: string },
  ): Promise<{ success: boolean; message: string }> {
    await this.subscriptionsService.updateProgress(clientName, body.progress);
    return {
      success: true,
      message: 'Progress updated successfully',
    };
  }

  @Put(':clientName/run-number')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Increment subscription run number' })
  @ApiParam({ name: 'clientName', description: 'Client organization name' })
  @ApiOkResponse({ description: 'Run number incremented successfully' })
  async incrementRunNumber(
    @Param('clientName') clientName: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.subscriptionsService.incrementRunNumber(clientName);
    return {
      success: true,
      message: 'Run number incremented successfully',
    };
  }

  @Get(':clientName/feature-access')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate feature access for subscription' })
  @ApiParam({ name: 'clientName', description: 'Client organization name' })
  @ApiQuery({ name: 'feature', description: 'Feature to validate access for' })
  @ApiOkResponse({ description: 'Feature access validation result' })
  async validateFeatureAccess(
    @Param('clientName') clientName: string,
    @Query('feature') feature: string,
  ): Promise<{
    success: boolean;
    allowed: boolean;
    reason?: string;
  }> {
    const result = await this.subscriptionsService.validateFeatureAccess(
      clientName,
      feature,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription summary statistics' })
  @ApiOkResponse({ description: 'Subscription summary retrieved successfully' })
  async getSubscriptionSummary(): Promise<{
    success: boolean;
    data: any;
  }> {
    const summary = await this.subscriptionsService.getSubscriptionSummary();
    return {
      success: true,
      data: summary,
    };
  }
}
