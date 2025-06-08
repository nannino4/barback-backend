import { Expose, Transform } from "class-transformer";

export class OutUserPublicDto
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;
    
    @Expose()
    email!: string;
    
    @Expose()
    firstName!: string;
    
    @Expose()
    lastName!: string;
    
    @Expose()
    profilePictureUrl?: string;
}