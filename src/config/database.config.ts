import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface DatabaseConfig {
  // Legacy tables (keeping for backward compatibility)
  tableName: string;
  paymentsTableName: string;

  // New separate tables
  tables: {
    users: string;
    apps: string;
    clientsData: string;
    clientsSubs: string;
    payments: string;
    partnersCode: string;
    partners: string;
    pendingJoins: string;
    subscriptionTiers: string;
  };

  region: string;
  endpoint?: string;

  // Legacy GSI names (keeping for backward compatibility)
  gsiNames: {
    byUserIdIndex: string;
    byTypeIndex: string;
    byStatusIndex: string;
    byCreatedAtIndex: string;
  };

  // New GSI names for specific tables
  gsiByTable: {
    users: {
      byStatus: string;
      byPartnerCode: string;
      byRole: string;
    };
    apps: {
      byVisibility: string;
    };
    clientsData: {
      byDomain: string;
      byIndustry: string;
    };
    clientsSubs: {
      byTier: string;
      byPaymentStatus: string;
    };
    payments: {
      byClient: string;
      byUser: string;
      byStatus: string;
      byStripeIntent: string;
    };
    partnersCode: {
      byPartner: string;
      byStatus: string;
    };
    partners: {
      byName: string;
    };
    pendingJoins: {
      byEmail: string;
      byClient: string;
    };
    subscriptionTiers: {
      byStatus: string;
    };
  };
}

export const databaseConfigValidationSchema = Joi.object({
  // Legacy configuration
  DYNAMODB_TABLE_NAME: Joi.string().default('threatiligence-platform'),
  DYNAMODB_PAYMENTS_TABLE_NAME: Joi.string().default('threatiligence-payments'),

  // New table names
  USERS_TABLE: Joi.string().default('users'),
  APPS_TABLE: Joi.string().default('apps'),
  CLIENTS_DATA_TABLE: Joi.string().default('clients_data'),
  CLIENTS_SUBS_TABLE: Joi.string().default('clients_subs'),
  PAYMENTS_TABLE: Joi.string().default('payments'),
  PARTNERS_CODE_TABLE: Joi.string().default('partners_code'),
  PARTNERS_TABLE: Joi.string().default('partners'),
  PENDING_JOINS_TABLE: Joi.string().default('pending_joins'),
  SUBSCRIPTION_TIERS_TABLE: Joi.string().default('subscription_tiers'),

  DYNAMODB_REGION: Joi.string().default('ap-southeast-2'),
  DYNAMODB_ENDPOINT: Joi.string().optional(),

  // Legacy GSI names
  GSI_BY_USER_ID: Joi.string().default('byUserIdIndex'),
  GSI_BY_TYPE: Joi.string().default('byTypeIndex'),
  GSI_BY_STATUS: Joi.string().default('byStatusIndex'),
  GSI_BY_CREATED_AT: Joi.string().default('byCreatedAtIndex'),

  // New GSI names
  USERS_GSI_BY_STATUS: Joi.string().default('UsersByStatus'),
  USERS_GSI_BY_PARTNER_CODE: Joi.string().default('UsersByPartnerCode'),
  USERS_GSI_BY_ROLE: Joi.string().default('UsersByRole'),
  APPS_GSI_BY_VISIBILITY: Joi.string().default('AppsByVisibility'),
  CLIENTS_DATA_GSI_BY_DOMAIN: Joi.string().default('ClientsByDomain'),
  CLIENTS_DATA_GSI_BY_INDUSTRY: Joi.string().default('ClientsByIndustry'),
  CLIENTS_SUBS_GSI_BY_TIER: Joi.string().default('SubscriptionsByTier'),
  CLIENTS_SUBS_GSI_BY_PAYMENT_STATUS: Joi.string().default(
    'SubscriptionsByPaymentStatus',
  ),
  PAYMENTS_GSI_BY_CLIENT: Joi.string().default('PaymentsByClient'),
  PAYMENTS_GSI_BY_USER: Joi.string().default('PaymentsByUser'),
  PAYMENTS_GSI_BY_STATUS: Joi.string().default('PaymentsByStatus'),
  PAYMENTS_GSI_BY_STRIPE_INTENT: Joi.string().default('PaymentsByStripeIntent'),
  PARTNERS_CODE_GSI_BY_PARTNER: Joi.string().default('CodesByPartner'),
  PARTNERS_CODE_GSI_BY_STATUS: Joi.string().default('CodesByStatus'),
  PARTNERS_GSI_BY_NAME: Joi.string().default('PartnersByName'),
  PENDING_JOINS_GSI_BY_EMAIL: Joi.string().default('PendingJoinsByEmail'),
  PENDING_JOINS_GSI_BY_CLIENT: Joi.string().default('PendingJoinsByClient'),
  SUBSCRIPTION_TIERS_GSI_BY_STATUS: Joi.string().default('TiersByStatus'),
});

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    // Legacy configuration (keeping for backward compatibility)
    tableName: process.env.DYNAMODB_TABLE_NAME || 'threatiligence-platform',
    paymentsTableName:
      process.env.DYNAMODB_PAYMENTS_TABLE_NAME || 'threatiligence-payments',

    // New separate tables
    tables: {
      users: process.env.USERS_TABLE || 'users',
      apps: process.env.APPS_TABLE || 'apps',
      clientsData: process.env.CLIENTS_DATA_TABLE || 'clients_data',
      clientsSubs: process.env.CLIENTS_SUBS_TABLE || 'clients_subs',
      payments: process.env.PAYMENTS_TABLE || 'payments',
      partnersCode: process.env.PARTNERS_CODE_TABLE || 'partners_code',
      partners: process.env.PARTNERS_TABLE || 'partners',
      pendingJoins: process.env.PENDING_JOINS_TABLE || 'pending_joins',
      subscriptionTiers:
        process.env.SUBSCRIPTION_TIERS_TABLE || 'subscription_tiers',
    },

    region: process.env.DYNAMODB_REGION || 'ap-southeast-2',
    endpoint: process.env.DYNAMODB_ENDPOINT,

    // Legacy GSI names (keeping for backward compatibility)
    gsiNames: {
      byUserIdIndex: process.env.GSI_BY_USER_ID || 'byUserIdIndex',
      byTypeIndex: process.env.GSI_BY_TYPE || 'byTypeIndex',
      byStatusIndex: process.env.GSI_BY_STATUS || 'byStatusIndex',
      byCreatedAtIndex: process.env.GSI_BY_CREATED_AT || 'byCreatedAtIndex',
    },

    // New GSI names for specific tables
    gsiByTable: {
      users: {
        byStatus: process.env.USERS_GSI_BY_STATUS || 'UsersByStatus',
        byPartnerCode:
          process.env.USERS_GSI_BY_PARTNER_CODE || 'UsersByPartnerCode',
        byRole: process.env.USERS_GSI_BY_ROLE || 'UsersByRole',
      },
      apps: {
        byVisibility: process.env.APPS_GSI_BY_VISIBILITY || 'AppsByVisibility',
      },
      clientsData: {
        byDomain: process.env.CLIENTS_DATA_GSI_BY_DOMAIN || 'ClientsByDomain',
        byIndustry:
          process.env.CLIENTS_DATA_GSI_BY_INDUSTRY || 'ClientsByIndustry',
      },
      clientsSubs: {
        byTier: process.env.CLIENTS_SUBS_GSI_BY_TIER || 'SubscriptionsByTier',
        byPaymentStatus:
          process.env.CLIENTS_SUBS_GSI_BY_PAYMENT_STATUS ||
          'SubscriptionsByPaymentStatus',
      },
      payments: {
        byClient: process.env.PAYMENTS_GSI_BY_CLIENT || 'PaymentsByClient',
        byUser: process.env.PAYMENTS_GSI_BY_USER || 'PaymentsByUser',
        byStatus: process.env.PAYMENTS_GSI_BY_STATUS || 'PaymentsByStatus',
        byStripeIntent:
          process.env.PAYMENTS_GSI_BY_STRIPE_INTENT || 'PaymentsByStripeIntent',
      },
      partnersCode: {
        byPartner: process.env.PARTNERS_CODE_GSI_BY_PARTNER || 'CodesByPartner',
        byStatus: process.env.PARTNERS_CODE_GSI_BY_STATUS || 'CodesByStatus',
      },
      partners: {
        byName: process.env.PARTNERS_GSI_BY_NAME || 'PartnersByName',
      },
      pendingJoins: {
        byEmail:
          process.env.PENDING_JOINS_GSI_BY_EMAIL || 'PendingJoinsByEmail',
        byClient:
          process.env.PENDING_JOINS_GSI_BY_CLIENT || 'PendingJoinsByClient',
      },
      subscriptionTiers: {
        byStatus:
          process.env.SUBSCRIPTION_TIERS_GSI_BY_STATUS || 'TiersByStatus',
      },
    },
  }),
);
