import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { SetDefaultPaymentMethodDto } from './dto/set-default-payment-method.dto';
import { OutPaymentMethodDto } from './dto/out.payment-method.dto';
import { plainToInstance } from 'class-transformer';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController 
{
    private readonly logger = new Logger(PaymentController.name);

    constructor(private readonly paymentService: PaymentService) {}

    @Get('methods')
    async getPaymentMethods(@Request() req: any): Promise<OutPaymentMethodDto[]> 
    {
        this.logger.debug(`Getting payment methods for user: ${req.user.id}`, 'PaymentController#getPaymentMethods');
        const paymentMethods = await this.paymentService.getPaymentMethods(req.user.id);
        return plainToInstance(OutPaymentMethodDto, paymentMethods, { excludeExtraneousValues: true });
    }

    @Post('methods')
    async addPaymentMethod(@Request() req: any, @Body() addPaymentMethodDto: AddPaymentMethodDto): Promise<OutPaymentMethodDto> 
    {
        this.logger.debug(`Adding payment method for user: ${req.user.id}`, 'PaymentController#addPaymentMethod');
        const paymentMethod = await this.paymentService.addPaymentMethod(req.user.id, addPaymentMethodDto.paymentMethodId);
        return plainToInstance(OutPaymentMethodDto, paymentMethod, { excludeExtraneousValues: true });
    }

    @Delete('methods/:paymentMethodId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removePaymentMethod(@Request() req: any, @Param('paymentMethodId') paymentMethodId: string): Promise<void> 
    {
        this.logger.debug(`Removing payment method ${paymentMethodId} for user: ${req.user.id}`, 'PaymentController#removePaymentMethod');
        await this.paymentService.removePaymentMethod(req.user.id, paymentMethodId);
    }

    @Post('methods/default')
    @HttpCode(HttpStatus.NO_CONTENT)
    async setDefaultPaymentMethod(@Request() req: any, @Body() setDefaultPaymentMethodDto: SetDefaultPaymentMethodDto): Promise<void> 
    {
        this.logger.debug(`Setting default payment method for user: ${req.user.id}`, 'PaymentController#setDefaultPaymentMethod');
        await this.paymentService.setDefaultPaymentMethod(req.user.id, setDefaultPaymentMethodDto.paymentMethodId);
    }
}
