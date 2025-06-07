export class OutUserDto
{
    id!: string;
    email!: string;
    firstName!: string;
    lastName!: string;
    phoneNumber?: string;
    profilePictureUrl?: string;
    isEmailVerified!: boolean;
}