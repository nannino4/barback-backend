import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Org } from './schemas/org.schema';
import { UserOrgRelation } from './schemas/user-org-relation.schema';
import { UpdateOrganizationDto } from './dto/in.update-org.dto';
import { CreateOrgDto } from './dto/in.create-org.dto';
import { CustomLogger } from '../common/logger/custom.logger';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { OrganizationNotFoundException, OrganizationNameExistsException } from './exceptions/org.exceptions';

@Injectable()
export class OrgService 
{
    constructor(
        @InjectModel(Org.name) private readonly orgModel: Model<Org>,
        @InjectModel(UserOrgRelation.name) private readonly relationshipModel: Model<UserOrgRelation>,
        private readonly logger: CustomLogger,
    ) {}

    async create(createData: CreateOrgDto, ownerId: Types.ObjectId, subscriptionId: Types.ObjectId): Promise<Org>
    {
        this.logger.debug(`Creating organization: ${createData.name} for owner: ${ownerId}`, 'OrgService#create');
        
        // Check for duplicate organization names for this owner
        try 
        {
            const existingOrg = await this.orgModel.findOne({ 
                name: createData.name, 
                ownerId: ownerId, 
            }).exec();
            if (existingOrg)
            {
                this.logger.warn(`Organization with name "${createData.name}" already exists for owner: ${ownerId}`, 'OrgService#create');
                throw new OrganizationNameExistsException(createData.name);
            }
        }
        catch (error)
        {
            if (error instanceof OrganizationNameExistsException)
            {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error during organization name check: ${createData.name}`, errorStack, 'OrgService#create');
            throw new DatabaseOperationException('organization name validation', errorMessage);
        }
        
        // Create the organization
        try 
        {
            const org = new this.orgModel({
                name: createData.name,
                ownerId: ownerId,
                subscriptionId: subscriptionId,
                settings: createData.settings || { defaultCurrency: 'EUR' },
            });
            
            await org.save();
            this.logger.debug(`Organization created successfully: ${org.name} with ID: ${org._id}`, 'OrgService#create');
            return org;
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error during organization creation: ${createData.name}`, errorStack, 'OrgService#create');
            throw new DatabaseOperationException('organization creation', errorMessage);
        }
    }

    async findById(orgId: Types.ObjectId): Promise<Org | null> 
    {
        this.logger.debug(`Finding organization by ID: ${orgId}`, 'OrgService#findById');
        
        try 
        {
            const org = await this.orgModel.findById(orgId).exec();
            if (!org)
            {
                this.logger.warn(`Organization not found for ID: ${orgId}`, 'OrgService#findById');
                return null;
            }
            this.logger.debug(`Found organization: ${org.name} for ID: ${orgId}`, 'OrgService#findById');
            return org;
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error while finding organization by ID: ${orgId}`, errorStack, 'OrgService#findById');
            throw new DatabaseOperationException('organization lookup by ID', errorMessage);
        }
    }

    async update(orgId: Types.ObjectId, updateData: UpdateOrganizationDto): Promise<Org>
    {
        this.logger.debug(`Attempting to update organization ID: ${orgId}`, 'OrgService#update');
        
        // Get the current organization to check ownership for name validation
        let currentOrg: Org | null;
        try 
        {
            currentOrg = await this.orgModel.findById(orgId).exec();
            if (!currentOrg)
            {
                this.logger.warn(`Organization with ID "${orgId}" not found for update`, 'OrgService#update');
                throw new OrganizationNotFoundException(orgId.toString());
            }
        }
        catch (error)
        {
            if (error instanceof OrganizationNotFoundException)
            {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error during organization lookup for update: ${orgId}`, errorStack, 'OrgService#update');
            throw new DatabaseOperationException('organization lookup for update', errorMessage);
        }
        
        // Check for duplicate organization names if name is being updated
        if (updateData.name && updateData.name !== currentOrg.name)
        {
            try 
            {
                const existingOrg = await this.orgModel.findOne({ 
                    name: updateData.name, 
                    ownerId: currentOrg.ownerId,
                    _id: { $ne: orgId }, 
                }).exec();
                if (existingOrg)
                {
                    this.logger.warn(`Organization with name "${updateData.name}" already exists for owner: ${currentOrg.ownerId}`, 'OrgService#update');
                    throw new OrganizationNameExistsException(updateData.name);
                }
            }
            catch (error)
            {
                if (error instanceof OrganizationNameExistsException)
                {
                    throw error;
                }
                const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
                const errorStack = error instanceof Error ? error.stack : undefined;
                this.logger.error(`Database error during organization name validation: ${updateData.name}`, errorStack, 'OrgService#update');
                throw new DatabaseOperationException('organization name validation', errorMessage);
            }
        }
        
        try 
        {
            const org = await this.orgModel.findByIdAndUpdate(
                orgId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).exec();
            
            // This shouldn't happen since we already verified the org exists, but keeping for safety
            if (!org)
            {
                this.logger.warn(`Organization with ID "${orgId}" not found during update operation`, 'OrgService#update');
                throw new OrganizationNotFoundException(orgId.toString());
            }
            
            this.logger.debug(`Organization updated successfully: ${org.name}`, 'OrgService#update');
            return org;
        }
        catch (error)
        {
            if (error instanceof OrganizationNotFoundException)
            {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error during organization update: ${orgId}`, errorStack, 'OrgService#update');
            throw new DatabaseOperationException('organization update', errorMessage);
        }
    }
}
