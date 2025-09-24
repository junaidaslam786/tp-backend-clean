import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from '../services/users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from '../repositories/user.repository';

/**
 * Users Controller
 * REST API endpoints for user management operations
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user profile
   * GET /users/profile
   */
  @Get('profile')
  async getProfile(@Param('userId') userId: string): Promise<User | null> {
    // Extract userId from JWT or param
    return this.usersService.getProfile(userId);
  }

  /**
   * Update current user profile
   * PUT /users/profile
   */
  @Put('profile')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() updateData: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(userId, updateData);
  }

  /**
   * Get user by ID (admin only)
   * GET /users/:id
   */
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User | null> {
    return this.usersService.getProfile(id);
  }

  /**
   * Get users by organization
   * GET /users/organization/:orgId
   */
  @Get('organization/:orgId')
  async getUsersByOrganization(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: number,
    @Query('lastEvaluatedKey') lastEvaluatedKey?: string,
  ): Promise<{ users: User[]; lastEvaluatedKey?: any }> {
    return this.usersService.getUsersByOrganization(
      orgId,
      limit || 25,
      lastEvaluatedKey,
    );
  }

  /**
   * Deactivate user account (admin only)
   * DELETE /users/:id/deactivate
   */
  @Delete(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateUser(@Param('id') id: string): Promise<User> {
    return this.usersService.deactivateUser(id);
  }

  /**
   * Check user permissions
   * GET /users/permissions/:action
   */
  @Get('permissions/:action')
  async checkPermissions(
    @Param('userId') userId: string,
    @Param('action') action: string,
  ): Promise<{ canPerform: boolean }> {
    const canPerform = await this.usersService.canPerformAction(
      userId,
      action,
    );
    return { canPerform };
  }
}
