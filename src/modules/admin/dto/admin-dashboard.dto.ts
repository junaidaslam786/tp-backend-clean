import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsArray } from 'class-validator';

export class AdminDashboardDto {
  @ApiProperty({ description: 'Total number of users' })
  @IsNumber()
  totalUsers: number;

  @ApiProperty({ description: 'Total number of organizations' })
  @IsNumber()
  totalOrganizations: number;

  @ApiProperty({ description: 'Total number of active subscriptions' })
  @IsNumber()
  activeSubscriptions: number;

  @ApiProperty({ description: 'Total number of assessments' })
  @IsNumber()
  totalAssessments: number;

  @ApiProperty({ description: 'Recent activity logs' })
  @IsArray()
  @IsString({ each: true })
  recentActivity: string[];
}
