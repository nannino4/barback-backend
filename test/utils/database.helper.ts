import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';

export class DatabaseTestHelper
{
    private static mongoServer: MongoMemoryReplSet;

    static async startInMemoryDatabase(): Promise<string>
    {
        this.mongoServer = await MongoMemoryReplSet.create({
            replSet: { count: 1, storageEngine: 'wiredTiger' },
        });
        return this.mongoServer.getUri();
    }

    static async stopInMemoryDatabase(): Promise<void>
    {
        if (this.mongoServer)
        {
            await this.mongoServer.stop();
        }
    }

    static getMongooseTestModule()
    {
        return MongooseModule.forRootAsync({
            useFactory: async () =>
            {
                const uri = await this.startInMemoryDatabase();
                return { uri };
            },
        });
    }

    static async clearDatabase(connection: any): Promise<void>
    {
        const collections = await connection.db.collections();
        
        for (const collection of collections)
        {
            await collection.deleteMany({});
        }
    }
}
