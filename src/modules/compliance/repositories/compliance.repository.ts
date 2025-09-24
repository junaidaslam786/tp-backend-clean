import { Injectable } from '@nestjs/common';
import { ComplianceAssessmentDto } from '../dto/compliance-assessment.dto';

@Injectable()
export class ComplianceRepository {
  // In-memory store for demonstration (replace with DynamoDB in production)
  private assessments: Map<string, ComplianceAssessmentDto> = new Map();

  async createAssessment(
    dto: ComplianceAssessmentDto,
  ): Promise<ComplianceAssessmentDto> {
    this.assessments.set(dto.assessmentId, dto);
    return dto;
  }

  async findAssessmentById(
    assessmentId: string,
  ): Promise<ComplianceAssessmentDto | null> {
    return this.assessments.get(assessmentId) || null;
  }

  async updateAssessment(
    dto: ComplianceAssessmentDto,
  ): Promise<ComplianceAssessmentDto> {
    if (!this.assessments.has(dto.assessmentId)) {
      throw new Error('Assessment not found');
    }
    this.assessments.set(dto.assessmentId, dto);
    return dto;
  }

  async deleteAssessment(assessmentId: string): Promise<void> {
    this.assessments.delete(assessmentId);
  }

  async listAssessmentsByOrg(
    organizationId: string,
  ): Promise<ComplianceAssessmentDto[]> {
    return Array.from(this.assessments.values()).filter(
      (a) => a.organizationId === organizationId,
    );
  }
}
