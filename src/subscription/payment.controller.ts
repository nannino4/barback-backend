import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { PaymentService } from './payment.service';
import { InAddPaymentMethodDto } from './dto/in.add-payment-method.dto';
import { InSetDefaultPaymentMethodDto } from './dto/in.set-default-payment-method.dto';
import { OutPaymentMethodDto } from './dto/out.payment-method.dto';
import { plainToInstance } from 'class-transformer';
import { CustomLogger } from '../common/logger/custom.logger';

@Controller('payment')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class PaymentController 
{
    constructor(
        private readonly paymentService: PaymentService,
        private readonly logger: CustomLogger,
    ) {}

    @Get('methods')
    async getPaymentMethods(@CurrentUser() user: User): Promise<OutPaymentMethodDto[]> 
    {
        this.logger.debug(`Getting payment methods for user: ${user.id}`, 'PaymentController#getPaymentMethods');
        const paymentMethods = await this.paymentService.getPaymentMethods(user.id);
        return plainToInstance(OutPaymentMethodDto, paymentMethods, { excludeExtraneousValues: true });
    }

    @Post('methods')
    async addPaymentMethod(@CurrentUser() user: User, @Body() addPaymentMethodDto: InAddPaymentMethodDto): Promise<OutPaymentMethodDto> 
    {
        this.logger.debug(`Adding payment method for user: ${user.id}`, 'PaymentController#addPaymentMethod');
        const paymentMethod = await this.paymentService.addPaymentMethod(user.id, addPaymentMethodDto.paymentMethodId);
        return plainToInstance(OutPaymentMethodDto, paymentMethod, { excludeExtraneousValues: true });
    }

    @Delete('methods/:paymentMethodId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removePaymentMethod(@CurrentUser() user: User, @Param('paymentMethodId') paymentMethodId: string): Promise<void> 
    {
        this.logger.debug(`Removing payment method ${paymentMethodId} for user: ${user.id}`, 'PaymentController#removePaymentMethod');
        await this.paymentService.removePaymentMethod(user.id, paymentMethodId);
    }

    @Post('methods/default')
    @HttpCode(HttpStatus.NO_CONTENT)
    async setDefaultPaymentMethod(@CurrentUser() user: User, @Body() setDefaultPaymentMethodDto: InSetDefaultPaymentMethodDto): Promise<void> 
    {
        this.logger.debug(`Setting default payment method for user: ${user.id}`, 'PaymentController#setDefaultPaymentMethod');
        await this.paymentService.setDefaultPaymentMethod(user.id, setDefaultPaymentMethodDto.paymentMethodId);
    }
}
