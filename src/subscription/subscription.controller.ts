import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ChangeSubscriptionTierDto } from './dto/change-subscription-tier.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Controller('subscriptions')
export class SubscriptionController
{
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Post()
    create(@Body() createSubscriptionDto: CreateSubscriptionDto)
    {
        return this.subscriptionService.create(createSubscriptionDto);
    }

    @Get()
    findAll(@Query('limit') limit: number = 10, @Query('offset') offset: number = 0)
    {
        return this.subscriptionService.findAll(limit, offset);
    }

    @Get(':id')
    findOne(@Param('id') id: string)
    {
        return this.subscriptionService.findOne(id);
    }

    @Get('user/:userId')
    findByUserId(@Param('userId') userId: string)
    {
        return this.subscriptionService.findByUserId(userId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto)
    {
        return this.subscriptionService.update(id, updateSubscriptionDto);
    }

    @Patch(':id/change-tier')
    changeTier(@Param('id') id: string, @Body() changeTierDto: ChangeSubscriptionTierDto)
    {
        return this.subscriptionService.changeTier(id, changeTierDto);
    }

    @Patch(':id/cancel')
    cancel(@Param('id') id: string, @Body() cancelDto: CancelSubscriptionDto)
    {
        return this.subscriptionService.cancel(id, cancelDto);
    }

    @Patch(':id/reactivate')
    reactivate(@Param('id') id: string)
    {
        return this.subscriptionService.reactivate(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string)
    {
        return this.subscriptionService.remove(id);
    }
}
