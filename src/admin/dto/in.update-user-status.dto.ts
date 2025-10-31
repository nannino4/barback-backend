import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto
{
    @IsBoolean({ message: 'validation.admin.isActive.mustBeBoolean' })
    isActive!: boolean;
}
