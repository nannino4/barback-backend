import { IsEnum } from 'class-validator';
import { UserRole } from '../../user/schemas/user.schema';

export class UpdateUserRoleDto
{
    @IsEnum(UserRole, { message: 'validation.admin.role.invalid' })
    role!: UserRole;
}
