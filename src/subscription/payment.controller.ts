import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { SetDefaultPaymentMethodDto } from './dto/set-default-payment-method.dto';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController 
{
    private readonly logger = new Logger(PaymentController.name);

    constructor(private readonly paymentService: PaymentService) {}

    @Get('methods')
    async getPaymentMethods(@Request() req: any) 
    {
        this.logger.debug(`Getting payment methods for user: ${req.user.id}`, 'PaymentController#getPaymentMethods');
        return this.paymentService.getPaymentMethods(req.user.id);
    }

    @Post('methods')
    async addPaymentMethod(@Request() req: any, @Body() addPaymentMethodDto: AddPaymentMethodDto) 
    {
        this.logger.debug(`Adding payment method for user: ${req.user.id}`, 'PaymentController#addPaymentMethod');
        return this.paymentService.addPaymentMethod(req.user.id, addPaymentMethodDto.paymentMethodId);
    }

    @Delete('methods/:paymentMethodId')
    async removePaymentMethod(@Request() req: any, @Param('paymentMethodId') paymentMethodId: string) 
    {
        this.logger.debug(`Removing payment method ${paymentMethodId} for user: ${req.user.id}`, 'PaymentController#removePaymentMethod');
        await this.paymentService.removePaymentMethod(req.user.id, paymentMethodId);
        return { message: 'Payment method removed successfully' };
    }

    @Post('methods/default')
    async setDefaultPaymentMethod(@Request() req: any, @Body() setDefaultPaymentMethodDto: SetDefaultPaymentMethodDto) 
    {
        this.logger.debug(`Setting default payment method for user: ${req.user.id}`, 'PaymentController#setDefaultPaymentMethod');
        await this.paymentService.setDefaultPaymentMethod(req.user.id, setDefaultPaymentMethodDto.paymentMethodId);
        return { message: 'Default payment method set successfully' };
    }
}
