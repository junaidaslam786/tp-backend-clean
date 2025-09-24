import { Injectable } from '@nestjs/common';
import { ComplianceRepository } from '../repositories/compliance.repository';
import { ComplianceAssessmentDto } from '../dto/compliance-assessment.dto';

@Injectable()
export class ComplianceService {
  constructor(private readonly complianceRepository: ComplianceRepository) {}

  async createAssessment(dto: ComplianceAssessmentDto): Promise<ComplianceAssessmentDto> {
    return this.complianceRepository.createAssessment(dto);
  }

  async getAssessmentById(assessmentId: string): Promise<ComplianceAssessmentDto | null> {
    return this.complianceRepository.findAssessmentById(assessmentId);
  }

  async updateAssessment(dto: ComplianceAssessmentDto): Promise<ComplianceAssessmentDto> {
    return this.complianceRepository.updateAssessment(dto);
  }

  async deleteAssessment(assessmentId: string): Promise<void> {
    return this.complianceRepository.deleteAssessment(assessmentId);
  }

  async listAssessmentsByOrg(organizationId: string): Promise<ComplianceAssessmentDto[]> {
    return this.complianceRepository.listAssessmentsByOrg(organizationId);
  }
}
