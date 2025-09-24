import { Controller, Post, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { ComplianceService } from '../services/compliance.service';
import { ComplianceAssessmentDto } from '../dto/compliance-assessment.dto';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('assessment')
  async createAssessment(@Body() dto: ComplianceAssessmentDto) {
    return this.complianceService.createAssessment(dto);
  }

  @Get('assessment/:id')
  async getAssessment(@Param('id') id: string) {
    return this.complianceService.getAssessmentById(id);
  }

  @Put('assessment/:id')
  async updateAssessment(@Param('id') id: string, @Body() dto: ComplianceAssessmentDto) {
    // Optionally ensure dto.assessmentId === id
    return this.complianceService.updateAssessment(dto);
  }

  @Delete('assessment/:id')
  async deleteAssessment(@Param('id') id: string) {
    return this.complianceService.deleteAssessment(id);
  }

  @Get('organization/:orgId/assessments')
  async listAssessmentsByOrg(@Param('orgId') orgId: string) {
    return this.complianceService.listAssessmentsByOrg(orgId);
  }
}
