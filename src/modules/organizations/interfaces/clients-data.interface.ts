import { BaseEntity } from '../../../core/database/repositories/base.repository';

export interface ClientsData extends BaseEntity {
  client_name: string; // Partition key - extracted from email before @
  organization_name: string; // Sort key - organization name
  org_domain: string; // Domain part after @ in email
  org_home_link?: string;
  org_about_us_link?: string;
  origin_country: string;
  operating_countries: string[];
  government: 'yes' | 'no';
  additional_context?: string;
  industry_sector: string;
  admins: string[]; // Array of admin email addresses
  viewers: string[]; // Array of viewer email addresses
  total_users: number;
  app_count: number;
  // Organization profile fields
  company_size?: OrganizationSize;
  annual_revenue?: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: OrganizationAddress;
  compliance_frameworks?: string[];
  security_certifications?: string[];
  // Metadata
  subscription_tier?: string;
  last_assessment_date?: string;
  risk_score?: number;
  maturity_score?: number;
  active_runs?: number;
}

export enum OrganizationSize {
  STARTUP = 'startup', // 1-10 employees
  SMALL = 'small', // 11-50 employees
  MEDIUM = 'medium', // 51-200 employees
  LARGE = 'large', // 201-1000 employees
  ENTERPRISE = 'enterprise', // 1000+ employees
}

export interface OrganizationAddress {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface OrganizationStats {
  total_organizations: number;
  by_industry: Record<string, number>;
  by_country: Record<string, number>;
  by_size: Record<OrganizationSize, number>;
  average_users_per_org: number;
  average_apps_per_org: number;
}

export interface OrganizationProfile {
  client_name: string;
  organization_name: string;
  org_domain: string;
  industry_sector: string;
  origin_country: string;
  operating_countries: string[];
  company_size?: OrganizationSize;
  total_users: number;
  app_count: number;
  admins: string[];
  viewers: string[];
  compliance_frameworks?: string[];
  security_certifications?: string[];
  risk_score?: number;
  maturity_score?: number;
}
