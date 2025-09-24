import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards';
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto, UpdatePaymentStatusDto, PaymentDto } from '../dto/payment.dto';
import { Payment } from '../interfaces';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new payment for subscription' })
  @ApiCreatedResponse({
    description: 'Payment created successfully',
    type: PaymentDto,
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<{ success: boolean; data: Payment }> {
    const payment = await this.paymentsService.createPayment(createPaymentDto);
    return {
      success: true,
      data: payment,
    };
  }

  @Post(':paymentId/process')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process payment and create/upgrade subscription' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiOkResponse({
    description: 'Payment processed successfully',
  })
  async processPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: { stripe_payment_intent_id: string },
  ): Promise<{
    success: boolean;
    message: string;
    requiresRoleUpdate?: boolean;
  }> {
    const result = await this.paymentsService.processPayment(
      paymentId,
      body.stripe_payment_intent_id,
    );
    return result;
  }

  @Get(':paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiOkResponse({
    description: 'Payment retrieved successfully',
    type: PaymentDto,
  })
  async getPaymentById(
    @Param('paymentId') paymentId: string,
  ): Promise<{ success: boolean; data: Payment | null }> {
    const payment = await this.paymentsService.getPaymentById(paymentId);
    return {
      success: true,
      data: payment,
    };
  }

  @Get('client/:clientName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments by client name' })
  @ApiParam({ name: 'clientName', description: 'Client organization name' })
  @ApiOkResponse({
    description: 'Payments retrieved successfully',
    type: [PaymentDto],
  })
  async getPaymentsByClient(
    @Param('clientName') clientName: string,
  ): Promise<{ success: boolean; data: Payment[] }> {
    const payments = await this.paymentsService.getPaymentsByClientName(
      clientName,
    );
    return {
      success: true,
      data: payments,
    };
  }

  @Put(':paymentId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment status' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiOkResponse({
    description: 'Payment status updated successfully',
    type: PaymentDto,
  })
  async updatePaymentStatus(
    @Param('paymentId') paymentId: string,
    @Body() updateStatusDto: UpdatePaymentStatusDto,
  ): Promise<{ success: boolean; data: Payment }> {
    const payment = await this.paymentsService.updatePaymentStatus(
      paymentId,
      updateStatusDto,
    );
    return {
      success: true,
      data: payment,
    };
  }

  @Get('summary/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment summary statistics' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for summary (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for summary (ISO string)',
  })
  @ApiOkResponse({ description: 'Payment summary retrieved successfully' })
  async getPaymentSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ success: boolean; data: any }> {
    const summary = await this.paymentsService.getPaymentSummary();
    return {
      success: true,
      data: summary,
    };
  }

  @Post(':paymentId/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process payment refund' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiOkResponse({ description: 'Refund processed successfully' })
  async processRefund(
    @Param('paymentId') paymentId: string,
    @Body() body: { reason: string },
  ): Promise<{
    success: boolean;
    message: string;
    refundAmount: number;
  }> {
    const result = await this.paymentsService.processRefund(
      paymentId,
      body.reason,
    );
    return result;
  }

  @Get(':paymentId/refund-calculation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate refund amount for payment' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiOkResponse({ description: 'Refund calculation completed' })
  async calculateRefund(
    @Param('paymentId') paymentId: string,
  ): Promise<{
    success: boolean;
    data: {
      eligibleForRefund: boolean;
      refundAmount: number;
      reason?: string;
    };
  }> {
    const result = await this.paymentsService.calculateRefund(paymentId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('partner-code/validate')
  @ApiOperation({ summary: 'Validate partner referral code' })
  @ApiOkResponse({ description: 'Partner code validation result' })
  async validatePartnerCode(
    @Body() body: { partner_code: string },
  ): Promise<{
    success: boolean;
    data: {
      valid: boolean;
      discount?: number;
      partnerName?: string;
    };
  }> {
    const result = await this.paymentsService.validatePartnerCode(
      body.partner_code,
    );
    return {
      success: true,
      data: result,
    };
  }
}
