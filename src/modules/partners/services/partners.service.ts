import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PartnerDto, PaymentMethod } from '../dto/partner.dto';
import { PartnerCodeDto } from '../dto/partner-code.dto';
import { CreatePartnerDto } from '../dto/create-partner.dto';
import { UpdatePartnerDto } from '../dto/update-partner.dto';
import { PartnerRepository } from '../repositories/partner.repository';
import { PartnerCodeRepository } from '../repositories/partner-code.repository';

@Injectable()
export class PartnersService {
  constructor(
    private readonly partnerRepository: PartnerRepository,
    private readonly partnerCodeRepository: PartnerCodeRepository,
  ) {}

  async createPartner(createPartnerDto: CreatePartnerDto): Promise<PartnerDto> {
    // Validate email uniqueness
    const existing = await this.partnerRepository.findByEmail(
      createPartnerDto.contactEmail,
    );
    if (existing) {
      throw new BadRequestException(
        'A partner with this email already exists.',
      );
    }
    // Set defaults
    if (typeof createPartnerDto.commissionRate !== 'number') {
      createPartnerDto.commissionRate = 15.0;
    }
    if (!createPartnerDto.paymentMethod) {
      createPartnerDto.paymentMethod = PaymentMethod.BANK_TRANSFER;
    }
    // Create partner
    const partner = await this.partnerRepository.create(createPartnerDto);
    // Create default partner code
    await this.partnerCodeRepository.create({
      partnerId: partner.partnerId,
      isActive: true,
      currentUses: 0,
      conversions: 0,
      totalValue: 0,
    });
    return partner;
  }

  async listPartners(
    limit: number,
    offset: number,
  ): Promise<{
    partners: PartnerDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { partners, total } = await this.partnerRepository.findAll(
      limit,
      offset,
    );
    return { partners, total, limit, offset };
  }

  async getPartnerById(partnerId: string): Promise<PartnerDto> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    return partner;
  }

  async updatePartner(
    partnerId: string,
    updatePartnerDto: UpdatePartnerDto,
  ): Promise<PartnerDto> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    // If updating email, check uniqueness
    if (
      updatePartnerDto.contactEmail &&
      updatePartnerDto.contactEmail !== partner.contactEmail
    ) {
      const existing = await this.partnerRepository.findByEmail(
        updatePartnerDto.contactEmail,
      );
      if (existing) {
        throw new BadRequestException(
          'A partner with this email already exists.',
        );
      }
    }
    return this.partnerRepository.update(partnerId, updatePartnerDto);
  }

  async deletePartner(partnerId: string): Promise<void> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    // Deactivate all partner codes
    const codes = await this.partnerCodeRepository.findByPartnerId(partnerId);
    for (const code of codes) {
      await this.partnerCodeRepository.updateStatus(code.code, false);
    }
    await this.partnerRepository.delete(partnerId);
  }

  async validatePartnerCode(code: string): Promise<{
    code: string;
    isValid: boolean;
    partnerId?: string;
    commissionRate?: number;
    maxUses?: number;
    currentUses?: number;
  }> {
    const partnerCode = await this.partnerCodeRepository.findByCode(code);
    if (!partnerCode || !partnerCode.isActive) {
      return { code, isValid: false };
    }
    // Check expiration
    if (partnerCode.expiresAt && new Date(partnerCode.expiresAt) < new Date()) {
      return { code, isValid: false };
    }
    // Check usage
    if (
      typeof partnerCode.maxUses === 'number' &&
      partnerCode.currentUses >= partnerCode.maxUses
    ) {
      return { code, isValid: false };
    }
    // Get partner for commission rate
    const partner = await this.partnerRepository.findById(
      partnerCode.partnerId,
    );
    return {
      code,
      isValid: true,
      partnerId: partnerCode.partnerId,
      commissionRate: partner?.commissionRate,
      maxUses: partnerCode.maxUses,
      currentUses: partnerCode.currentUses,
    };
  }

  async createPartnerCode(
    partnerId: string,
    codeData: { maxUses?: number; expiresAt?: string },
  ): Promise<PartnerCodeDto> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    // Generate a unique code (simple random string, should be improved for prod)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const partnerCode = await this.partnerCodeRepository.create({
      code,
      partnerId,
      isActive: true,
      currentUses: 0,
      conversions: 0,
      totalValue: 0,
      ...codeData,
    });
    return partnerCode;
  }

  async getPartnerCodes(partnerId: string): Promise<PartnerCodeDto[]> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    return this.partnerCodeRepository.findByPartnerId(partnerId);
  }

  async incrementCodeUsage(code: string): Promise<void> {
    const partnerCode = await this.partnerCodeRepository.findByCode(code);
    if (!partnerCode) {
      throw new NotFoundException('Partner code not found');
    }
    await this.partnerCodeRepository.incrementUsage(partnerCode.code);
  }

  async calculateCommission(
    partnerId: string,
    subscriptionAmount: number,
  ): Promise<number> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    // Commission is a percentage of the subscription amount
    return Math.round((partner.commissionRate / 100) * subscriptionAmount);
  }

  /**
   * Partner Integration Management
   */
  async getSecurityVendorIntegrations(partnerId: string): Promise<any[]> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    if (partner.businessType !== 'SECURITY_VENDOR') {
      throw new BadRequestException('Partner is not a security vendor');
    }

    // Mock integration data - in production this would connect to actual vendor APIs
    return [
      {
        integrationId: 'nist-framework',
        name: 'NIST Cybersecurity Framework',
        description: 'Integration with NIST framework for threat assessment',
        apiEndpoint: `https://api.${partner.companyName.toLowerCase()}.com/nist`,
        dataFields: ['threats', 'vulnerabilities', 'controls'],
        status: 'active',
        lastSync: new Date().toISOString(),
      },
      {
        integrationId: 'iso27001',
        name: 'ISO 27001 Assessment',
        description: 'ISO 27001 compliance assessment integration',
        apiEndpoint: `https://api.${partner.companyName.toLowerCase()}.com/iso27001`,
        dataFields: ['compliance_score', 'gaps', 'recommendations'],
        status: 'active',
        lastSync: new Date().toISOString(),
      },
    ];
  }

  async getComplianceFrameworkData(
    partnerId: string,
    frameworkType: 'nist' | 'iso27001' | 'sox' | 'gdpr' | 'hipaa',
    organizationId: string,
  ): Promise<any> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    if (partner.businessType !== 'COMPLIANCE_FRAMEWORK') {
      throw new BadRequestException('Partner is not a compliance framework provider');
    }

    // Mock compliance data - in production this would fetch from partner APIs
    const complianceData = {
      nist: {
        framework: 'NIST Cybersecurity Framework v1.1',
        categories: {
          identify: { score: 85, gaps: ['Asset Management', 'Risk Assessment'] },
          protect: { score: 78, gaps: ['Access Control', 'Data Security'] },
          detect: { score: 92, gaps: [] },
          respond: { score: 67, gaps: ['Response Planning', 'Communications'] },
          recover: { score: 71, gaps: ['Recovery Planning'] },
        },
        overallScore: 78.6,
        recommendations: [
          'Implement comprehensive asset inventory system',
          'Enhance incident response procedures',
          'Strengthen access control mechanisms',
        ],
      },
      iso27001: {
        framework: 'ISO/IEC 27001:2013',
        domains: {
          'A.5': { name: 'Information Security Policies', score: 90 },
          'A.6': { name: 'Organization of Information Security', score: 85 },
          'A.7': { name: 'Human Resource Security', score: 75 },
          'A.8': { name: 'Asset Management', score: 80 },
          'A.9': { name: 'Access Control', score: 70 },
        },
        overallScore: 80,
        certificateStatus: 'preparation',
        gapAnalysis: [
          'Strengthen access control procedures',
          'Improve incident management documentation',
        ],
      },
    };

    return {
      organizationId,
      partnerId,
      framework: frameworkType.toUpperCase(),
      assessmentDate: new Date().toISOString(),
      data: complianceData[frameworkType] || {},
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
  }

  async getDataSourceIntegrations(partnerId: string): Promise<any[]> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    if (partner.businessType !== 'DATA_SOURCE') {
      throw new BadRequestException('Partner is not a data source provider');
    }

    // Mock data source integrations
    return [
      {
        sourceId: 'threat-intelligence',
        name: 'Threat Intelligence Feed',
        description: 'Real-time threat intelligence data',
        dataTypes: ['iocs', 'malware_signatures', 'threat_actors'],
        updateFrequency: 'real-time',
        apiEndpoint: `https://api.${partner.companyName.toLowerCase()}.com/threats`,
        status: 'active',
      },
      {
        sourceId: 'vulnerability-db',
        name: 'Vulnerability Database',
        description: 'Comprehensive vulnerability database',
        dataTypes: ['cves', 'exploits', 'patches'],
        updateFrequency: 'daily',
        apiEndpoint: `https://api.${partner.companyName.toLowerCase()}.com/vulns`,
        status: 'active',
      },
    ];
  }

  async syncPartnerData(
    partnerId: string,
    organizationId: string,
    dataType: 'threats' | 'vulnerabilities' | 'compliance' | 'assessments',
  ): Promise<any> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Mock data synchronization
    const syncResult = {
      partnerId,
      organizationId,
      dataType,
      syncId: `sync_${Date.now()}`,
      startTime: new Date().toISOString(),
      status: 'completed',
      recordsProcessed: Math.floor(Math.random() * 1000) + 100,
      recordsUpdated: Math.floor(Math.random() * 100) + 10,
      errors: [],
      completedAt: new Date(Date.now() + 5000).toISOString(),
    };

    // In production, this would trigger actual API calls to partner systems
    return syncResult;
  }

  /**
   * Partner API Key Management
   */
  async generateApiKey(partnerId: string): Promise<{ apiKey: string; expiresAt: string }> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Generate secure API key (simplified for demo)
    const apiKey = `pk_${partner.partnerId}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

    // In production, store this securely with proper encryption
    return { apiKey, expiresAt };
  }

  async validateApiKey(apiKey: string): Promise<{ valid: boolean; partnerId?: string }> {
    // In production, this would validate against encrypted stored keys
    const keyPattern = /^pk_([^_]+)_/;
    const match = apiKey.match(keyPattern);
    
    if (match) {
      const partnerId = match[1];
      const partner = await this.partnerRepository.findById(partnerId);
      return {
        valid: !!partner && partner.status === 'ACTIVE',
        partnerId: partner?.partnerId,
      };
    }
    
    return { valid: false };
  }

  /**
   * Partner Analytics and Reporting
   */
  async getPartnerAnalytics(
    partnerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Mock analytics data
    return {
      partnerId,
      period: {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString(),
      },
      metrics: {
        totalReferrals: partner.totalReferrals || 0,
        successfulConversions: partner.successfulConversions || 0,
        conversionRate: partner.totalReferrals 
          ? ((partner.successfulConversions || 0) / partner.totalReferrals * 100).toFixed(2)
          : 0,
        totalCommissionEarned: partner.totalCommissionEarned || 0,
        averageOrderValue: partner.successfulConversions 
          ? Math.round((partner.totalCommissionEarned || 0) / partner.successfulConversions)
          : 0,
      },
      recentActivity: [
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'referral',
          description: 'New organization signup via partner code',
        },
        {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'conversion',
          description: 'Referral converted to paid subscription',
        },
      ],
    };
  }

  /**
   * Find partner by referral code
   */
  async findByReferralCode(code: string): Promise<PartnerDto | null> {
    const partnerCode = await this.partnerCodeRepository.findByCode(code);
    if (!partnerCode) {
      return null;
    }
    return this.partnerRepository.findById(partnerCode.partnerId);
  }

  /**
   * Record referral attribution
   */
  async recordReferralAttribution(code: string, timestamp: number): Promise<void> {
    const partnerCode = await this.partnerCodeRepository.findByCode(code);
    if (partnerCode) {
      await this.partnerCodeRepository.incrementUsage(code);
      
      // Update partner statistics
      const partner = await this.partnerRepository.findById(partnerCode.partnerId);
      if (partner) {
        const updatedTotalReferrals = (partner.totalReferrals || 0) + 1;
        await this.partnerRepository.update(partnerCode.partnerId, {
          totalReferrals: updatedTotalReferrals,
        });
      }
    }
  }

  /**
   * Partner Onboarding and Support
   */
  async getOnboardingStatus(partnerId: string): Promise<any> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return {
      partnerId,
      currentStep: partner.status === 'PENDING' ? 'verification' : 'completed',
      completedSteps: [
        'application_submitted',
        'contact_verification',
        ...(partner.status !== 'PENDING' ? ['business_verification', 'agreement_signed'] : []),
      ],
      nextSteps: partner.status === 'PENDING' 
        ? ['business_verification', 'agreement_signed', 'integration_setup']
        : [],
      documents: [
        { name: 'Partner Agreement', status: partner.status === 'PENDING' ? 'pending' : 'signed' },
        { name: 'Business License', status: partner.status === 'PENDING' ? 'pending' : 'verified' },
      ],
      integrationGuides: [
        { title: 'API Integration Guide', url: '/docs/partner-api' },
        { title: 'Referral Code Setup', url: '/docs/referral-codes' },
        { title: 'Commission Structure', url: '/docs/commissions' },
      ],
    };
  }
}
