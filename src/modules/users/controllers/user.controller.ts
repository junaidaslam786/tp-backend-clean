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
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserSearchDto,
} from '../dto/user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.createUser(createUserDto, req.user);
  }

  @Get('profile')
  async getProfile(@Request() req: any): Promise<UserResponseDto> {
    const user = await this.userService.findByEmail(req.user.email);
    return user;
  }

  @Get('search')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  async searchUsers(
    @Query() searchDto: UserSearchDto,
    @Request() req: any,
  ): Promise<UserResponseDto[]> {
    return this.userService.searchUsers(searchDto, req.user);
  }

  @Get(':email')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  async getUserByEmail(
    @Param('email') email: string,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.findByEmail(email, req.user);
  }

  @Put('profile')
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.updateUser(req.user.email, updateUserDto, req.user);
  }

  @Put(':email')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  async updateUser(
    @Param('email') email: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.updateUser(email, updateUserDto, req.user);
  }

  @Put(':email/activate')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async activateUser(
    @Param('email') email: string,
    @Request() req: any,
  ): Promise<void> {
    await this.userService.activateUser(email, req.user);
  }

  @Put(':email/suspend')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspendUser(
    @Param('email') email: string,
    @Request() req: any,
  ): Promise<void> {
    await this.userService.suspendUser(email, req.user);
  }

  @Delete(':email')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('email') email: string,
    @Request() req: any,
  ): Promise<void> {
    await this.userService.deleteUser(email, req.user);
  }
}
