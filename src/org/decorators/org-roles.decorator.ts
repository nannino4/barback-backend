import { SetMetadata } from '@nestjs/common';
import { OrgRole } from '../schemas/user-org-relation.schema';

export const ORG_ROLES_KEY = 'orgRoles';
export const OrgRoles = (...roles: OrgRole[]) => SetMetadata(ORG_ROLES_KEY, roles);
