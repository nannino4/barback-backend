import { Expose, Transform } from "class-transformer";

export class OutUserDto
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
    phoneNumber?: string;
    
    @Expose()
    profilePictureUrl?: string;
    
    @Expose()
    isEmailVerified!: boolean;
}