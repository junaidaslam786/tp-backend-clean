import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/interfaces/user.interface';

export class RoleBasedRegistrationDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@company.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Organization name for assignment',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiPropertyOptional({
    description: 'Client name for organization identification',
    example: 'acme-corp',
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Partner referral code',
    example: 'REF123',
  })
  @IsOptional()
  @IsString()
  partnerReferralCode?: string;

  @ApiPropertyOptional({
    description: 'Requested user role',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(UserRole)
  requestedRole?: UserRole;

  @ApiPropertyOptional({
    description: 'Cognito groups assigned to the user',
    type: [String],
    example: ['ORG_ADMIN', 'VIEWER'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cognitoGroups?: string[];

  @ApiPropertyOptional({
    description: 'Cognito username',
    example: 'johndoe_123',
  })
  @IsOptional()
  @IsString()
  cognitoUsername?: string;
}

export class AssignAdminToOrganizationDto {
  @ApiProperty({
    description: 'Client name for organization identification',
    example: 'acme-corp',
  })
  @IsString()
  clientName: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
  })
  @IsString()
  organizationName: string;
}

export class RoleBasedOnboardingResponseDto {
  @ApiProperty({ description: 'Created/updated user object' })
  user: any; // This will be the User interface

  @ApiProperty({
    description: 'Type of user registered',
    enum: ['platform_admin', 'organization_admin', 'viewer'],
    example: 'organization_admin',
  })
  userType: 'platform_admin' | 'organization_admin' | 'viewer';

  @ApiProperty({
    description: 'Whether the user requires organization assignment',
    example: true,
  })
  requiresOrganization: boolean;

  @ApiProperty({
    description: 'Whether the registration needs approval',
    example: false,
  })
  needsApproval: boolean;

  @ApiProperty({
    description: 'Registration completion message',
    example: 'User registered successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Organization assigned to user (if applicable)',
  })
  organization?: any;

  @ApiPropertyOptional({
    description: 'Available organizations for selection',
    type: [Object],
  })
  availableOrganizations?: Array<{
    clientName: string;
    organizationName: string;
  }>;
}
