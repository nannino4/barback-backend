import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionStatus } from './schemas/subscription.schema';
import { User } from '../user/schemas/user.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Injectable()
export class SubscriptionService
{
    constructor(
        @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) { }

    async create(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription>
    {
        // Validate userId exists
        const user = await this.userModel.findById(createSubscriptionDto.userId).exec();
        if (!user)
        {
            throw new BadRequestException(`User with ID "${createSubscriptionDto.userId}" not found.`);
        }

        // Check if user already has an active subscription
        const existingSubscription = await this.subscriptionModel.findOne({
            userId: new Types.ObjectId(createSubscriptionDto.userId),
            status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING] },
        }).exec();

        if (existingSubscription)
        {
            throw new ConflictException(`User "${createSubscriptionDto.userId}" already has an active subscription.`);
        }

        // Set default values
        const subscriptionData = {
            ...createSubscriptionDto,
            userId: new Types.ObjectId(createSubscriptionDto.userId),
            startDate: createSubscriptionDto.startDate ? new Date(createSubscriptionDto.startDate) : new Date(),
        };

        const newSubscription = new this.subscriptionModel(subscriptionData);
        return newSubscription.save();
    }

    async findAll(limit: number, offset: number): Promise<Subscription[]>
    {
        return this.subscriptionModel.find().skip(offset).limit(limit).populate('userId').exec();
    }

    async findOne(id: string): Promise<Subscription>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Subscription ID format: "${id}"`);
        }
        const subscription = await this.subscriptionModel.findById(id).populate('userId').exec();
        if (!subscription)
        {
            throw new NotFoundException(`Subscription with ID "${id}" not found`);
        }
        return subscription;
    }

    async findByUserId(userId: string): Promise<Subscription>
    {
        if (!Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException(`Invalid User ID format: "${userId}"`);
        }
        const subscription = await this.subscriptionModel.findOne({
            userId: new Types.ObjectId(userId),
            status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING] },
        }).populate('userId').exec();

        if (!subscription)
        {
            throw new NotFoundException(`Active subscription not found for user "${userId}"`);
        }
        return subscription;
    }

    async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto): Promise<Subscription>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Subscription ID format: "${id}"`);
        }

        const updateData = {
            ...updateSubscriptionDto,
            lastRenewDate: updateSubscriptionDto.lastRenewDate ? new Date(updateSubscriptionDto.lastRenewDate) : undefined,
            nextRenewDate: updateSubscriptionDto.nextRenewDate ? new Date(updateSubscriptionDto.nextRenewDate) : undefined,
        };

        const existingSubscription = await this.subscriptionModel.findByIdAndUpdate(id, updateData, { new: true }).populate('userId').exec();
        if (!existingSubscription)
        {
            throw new NotFoundException(`Subscription with ID "${id}" not found`);
        }
        return existingSubscription;
    }

    async cancel(id: string, cancelSubscriptionDto: CancelSubscriptionDto): Promise<Subscription>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Subscription ID format: "${id}"`);
        }
        const subscription = await this.subscriptionModel.findById(id).exec();
        if (!subscription)
        {
            throw new NotFoundException(`Subscription with ID "${id}" not found`);
        }

        if (subscription.status === SubscriptionStatus.INACTIVE)
        {
            throw new ConflictException('Subscription is already inactive.');
        }


        const updatedSubscription = await this.subscriptionModel.findByIdAndUpdate(
            id,
            {
                status: SubscriptionStatus.INACTIVE,
                cancellationReason: cancelSubscriptionDto.reason,
                cancellationDate: new Date(),
                autoRenew: false,
            },
            { new: true },
        ).populate('userId').exec();

        if (!updatedSubscription)
        {
            throw new NotFoundException(`Subscription with ID "${id}" could not be updated.`);
        }
        return updatedSubscription;
    }

    async reactivate(id: string): Promise<Subscription>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Subscription ID format: "${id}"`);
        }
        const subscription = await this.subscriptionModel.findById(id).exec();
        if (!subscription)
        {
            throw new NotFoundException(`Subscription with ID "${id}" not found`);
        }

        if (subscription.status !== SubscriptionStatus.INACTIVE)
        {
            throw new ConflictException(`Subscription must be inactive to be reactivated. Current status: ${subscription.status}`);
        }

        const updatedSubscription = await this.subscriptionModel.findByIdAndUpdate(
            id,
            {
                status: SubscriptionStatus.PENDING,
                cancellationReason: undefined,
                cancellationDate: undefined,
            },
            { new: true },
        ).populate('userId').exec();

        if (!updatedSubscription)
        {
            throw new NotFoundException(`Subscription with ID "${id}" could not be updated.`);
        }
        return updatedSubscription;
    }

    async remove(id: string): Promise<any>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Subscription ID format: "${id}"`);
        }
        const result = await this.subscriptionModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0)
        {
            throw new NotFoundException(`Subscription with ID "${id}" not found or already deleted`);
        }
        return { message: `Subscription with ID "${id}" successfully deleted` };
    }
}
