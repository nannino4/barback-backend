import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';

export class DatabaseTestSetup
{
    private mongoMemoryServer!: MongoMemoryServer;
    private connectionString!: string;
    private connection!: mongoose.Connection;

    async setup(): Promise<void>
    {
        this.mongoMemoryServer = await MongoMemoryServer.create();
        this.connectionString = this.mongoMemoryServer.getUri();
        this.connection = await mongoose.createConnection(this.connectionString);
    }

    async teardown(): Promise<void>
    {
        if (this.connection)
        {
            await this.connection.close();
        }
        if (this.mongoMemoryServer)
        {
            await this.mongoMemoryServer.stop();
        }
    }

    getConnectionString(): string
    {
        return this.connectionString;
    }

    async clearDatabase(): Promise<void>
    {
        if (this.connection && this.connection.readyState === 1 && this.connection.db) 
        {
            const collections = await this.connection.db.collections();
            for (const collection of collections) 
            {
                await collection.deleteMany({});
            }
        }
    }

    // Static methods for backwards compatibility
    static async setupDatabase(): Promise<string>
    {
        const mongoMemoryServer = await MongoMemoryServer.create();
        return mongoMemoryServer.getUri();
    }

    static async teardownDatabase(): Promise<void>
    {
        // This method is kept for backwards compatibility but not used in new tests
    }

    static async clearDatabase(moduleRef: TestingModule): Promise<void>
    {
        const models = moduleRef.get('DatabaseConnection').models;
        const keys = Object.keys(models);
        const promises = keys.map((key) => models[key].deleteMany({}));
        await Promise.all(promises);
    }
}

export const createMockUser = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    hashedPassword: 'hashedPassword123',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockOrg = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    name: 'Test Bar',
    ownerId: new Types.ObjectId(),
    settings: {
        defaultCurrency: 'EUR',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockSubscription = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    tier: 'trial',
    price: 0,
    currency: 'EUR',
    billingPeriod: 'monthly',
    startDate: new Date(),
    autoRenew: true,
    status: 'pending',
    limits: {
        maxOrganizations: 1,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// Mock authentication for future use
export const mockAuthGuard = {
    canActivate: jest.fn(() => true),
};

// Mock payment service for future use
export const mockPaymentService = {
    processPayment: jest.fn(),
    refundPayment: jest.fn(),
    validatePaymentMethod: jest.fn(),
};

// Helper to create test module with common mocks
export async function createTestModule(imports: any[], providers: any[] = [], controllers: any[] = []): Promise<TestingModule>
{
    const mongoUri = await DatabaseTestSetup.setupDatabase();
    
    return Test.createTestingModule({
        imports: [
            MongooseModule.forRoot(mongoUri),
            ...imports,
        ],
        controllers,
        providers,
    }).compile();
}

// Helper to get model from test module
export function getTestModel<T>(moduleRef: TestingModule, token: string): Model<T>
{
    return moduleRef.get<Model<T>>(getModelToken(token));
}
