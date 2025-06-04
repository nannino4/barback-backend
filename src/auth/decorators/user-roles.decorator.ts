import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../user/schemas/user.schema';

export const USER_ROLES_KEY = 'userRoles';
export const UserRoles = (...roles: UserRole[]) => SetMetadata(USER_ROLES_KEY, roles);
