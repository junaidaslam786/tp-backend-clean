import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface PaymentConfig {
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  currency: string;
  defaultPricing: {
    basicPlan: number;
    proPlan: number;
    enterprisePlan: number;
  };
}

export const paymentConfigValidationSchema = Joi.object({
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  PAYMENT_CURRENCY: Joi.string().default('AUD'),
  BASIC_PLAN_PRICE: Joi.number().positive().default(999), // $9.99 in cents
  PRO_PLAN_PRICE: Joi.number().positive().default(2999), // $29.99 in cents
  ENTERPRISE_PLAN_PRICE: Joi.number().positive().default(9999), // $99.99 in cents
});

export const paymentConfig = registerAs(
  'payment',
  (): PaymentConfig => ({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: process.env.PAYMENT_CURRENCY || 'AUD',
    defaultPricing: {
      basicPlan: parseInt(process.env.BASIC_PLAN_PRICE || '999', 10),
      proPlan: parseInt(process.env.PRO_PLAN_PRICE || '2999', 10),
      enterprisePlan: parseInt(process.env.ENTERPRISE_PLAN_PRICE || '9999', 10),
    },
  }),
);
