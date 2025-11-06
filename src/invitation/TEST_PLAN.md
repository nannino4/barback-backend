# Invitation Module Test Plan

## Status
⚠️ **No tests currently exist for the invitation module**

## Recommended Test Coverage

### Unit Tests - invitation.service.spec.ts

**Setup & Mocking**:
- Mock `InvitationModel`
- Mock `UserOrgRelationModel`
- Mock `UserService`
- Mock `EmailService`
- Mock `CustomLogger`

**Test Cases**:

#### createInvitation()
- ✅ Should create invitation successfully
- ✅ Should throw when inviting as OWNER role
- ✅ Should throw when user is already a member
- ✅ Should throw when pending invitation already exists
- ✅ Should set expiration date 7 days from now
- ✅ Should send invitation email
- ✅ Should delete invitation if email fails
- ✅ Should populate orgId and invitedBy before returning
- ✅ Should throw InvitationEmailFailedException if email fails

#### findPendingInvitationsByEmail()
- ✅ Should return populated invitations for given email
- ✅ Should filter by PENDING status
- ✅ Should filter out expired invitations
- ✅ Should populate orgId with id and name
- ✅ Should populate invitedBy with all required fields (including profilePictureUrl)
- ✅ Should return empty array if no pending invitations

#### findPendingInvitationsByOrg()
- ✅ Should return populated invitations for organization
- ✅ Should filter by PENDING status
- ✅ Should sort by createdAt descending
- ✅ Should populate orgId and invitedBy
- ✅ Should return empty array if no invitations

#### acceptInvitation()
- ✅ Should accept valid pending invitation
- ✅ Should create UserOrgRelation with correct role
- ✅ Should update invitation status to ACCEPTED
- ✅ Should be idempotent (not create duplicate relation if already member)
- ✅ Should populate before returning
- ✅ Should throw InvalidInvitationException if not found
- ✅ Should throw InvalidInvitationException if expired
- ✅ Should throw InvalidInvitationException if not PENDING

#### declineInvitation()
- ✅ Should decline valid pending invitation
- ✅ Should update invitation status to DECLINED
- ✅ Should populate before returning
- ✅ Should throw InvalidInvitationException if not found
- ✅ Should throw InvalidInvitationException if expired

#### revokeInvitation()
- ✅ Should revoke pending invitation
- ✅ Should update invitation status to REVOKED
- ✅ Should verify orgId matches
- ✅ Should populate before returning
- ✅ Should throw InvitationNotFoundException if not found
- ✅ Should throw if orgId doesn't match

---

### Unit Tests - invitation.controller.spec.ts

**Setup & Mocking**:
- Mock `InvitationService`
- Mock `OrgService`
- Mock `CustomLogger`
- Mock guards (JwtAuthGuard, EmailVerifiedGuard, OrgRolesGuard, OrgSubscriptionGuard)

**Test Cases**:

#### sendInvitation()
- ✅ Should send invitation successfully
- ✅ Should require authentication
- ✅ Should require email verification
- ✅ Should require OWNER or MANAGER role
- ✅ Should throw NotFoundException if org not found
- ✅ Should return OutInvitationDto
- ✅ Should transform response with plainToInstance
- ✅ Should pass organization name to service

#### getOrganizationInvitations()
- ✅ Should return list of invitations for org
- ✅ Should require authentication
- ✅ Should require OWNER or MANAGER role
- ✅ Should return OutInvitationDto[]
- ✅ Should transform response with plainToInstance

#### revokeInvitation()
- ✅ Should revoke invitation successfully
- ✅ Should require authentication
- ✅ Should require OWNER or MANAGER role
- ✅ Should verify orgId parameter
- ✅ Should return OutInvitationDto
- ✅ Should transform response with plainToInstance

#### getUserPendingInvitations()
- ✅ Should return user's pending invitations
- ✅ Should require authentication
- ✅ Should use user's email from CurrentUser decorator
- ✅ Should return OutInvitationDto[]
- ✅ Should transform response with plainToInstance

#### acceptInvitation()
- ✅ Should accept invitation successfully
- ✅ Should require authentication
- ✅ Should use userId from CurrentUser decorator
- ✅ Should return OutInvitationDto
- ✅ Should transform response with plainToInstance

#### declineInvitation()
- ✅ Should decline invitation successfully
- ✅ Should require authentication
- ✅ Should return OutInvitationDto
- ✅ Should transform response with plainToInstance

---

### Integration/E2E Tests - invitation.e2e-spec.ts

**Test Scenarios**:

#### Happy Path Flow
1. Owner creates organization
2. Owner sends invitation to user
3. User receives invitation via GET /invites
4. User accepts invitation via POST /invites/:id/accept
5. User becomes member of organization
6. User can access organization endpoints

#### Invitation Lifecycle
- ✅ Send invitation → Check it appears in GET /orgs/:id/invitations
- ✅ Send invitation → Check it appears in GET /invites for invited user
- ✅ Revoke invitation → Check it no longer appears in lists
- ✅ Decline invitation → Check status updated correctly
- ✅ Accept invitation → Check user-org relation created

#### Authorization Tests
- ✅ Non-members cannot view org invitations
- ✅ STAFF cannot send invitations
- ✅ Only OWNER/MANAGER can revoke invitations
- ✅ Users can only see their own invitations
- ✅ Cannot accept invitation for different email

#### Validation Tests
- ✅ Invalid email format rejected
- ✅ Cannot invite as OWNER role
- ✅ Cannot send duplicate invitation
- ✅ Cannot invite existing member
- ✅ Invalid ObjectId format rejected

#### Data Population Tests
- ✅ POST /orgs/:id/invitations returns populated DTO
- ✅ GET /orgs/:id/invitations returns populated DTOs
- ✅ GET /invites returns populated DTOs
- ✅ POST /invites/:id/accept returns populated DTO
- ✅ POST /invites/:id/decline returns populated DTO
- ✅ DELETE /orgs/:id/invitations/:id returns populated DTO

#### Edge Cases
- ✅ Expired invitations not returned in lists
- ✅ Cannot accept expired invitation
- ✅ Cannot decline already accepted invitation
- ✅ Idempotent acceptance if already member
- ✅ Email failure rolls back invitation creation

---

### DTO Transformation Tests - out.invitation.dto.spec.ts

**Test Cases**:
- ✅ Should transform MongoDB document to DTO
- ✅ Should convert _id to string id field
- ✅ Should populate invitedBy as OutUserPublicDto
- ✅ Should populate organization as OutOrgPublicDto
- ✅ Should exclude extraneous values
- ✅ Should handle null profilePictureUrl
- ✅ Should format dates correctly
- ✅ Should expose all required fields

---

## Current Refactoring Impact

Since no tests exist, the refactoring has:
- ✅ **Zero test updates required** (no existing tests to break)
- ⚠️ **Zero test coverage** (no tests to verify behavior)

## Priority Recommendations

1. **High Priority**: Create `invitation.service.spec.ts`
   - Critical business logic
   - Email integration
   - Database operations
   - Population logic

2. **High Priority**: Create `invitation.controller.spec.ts`
   - DTO transformation
   - Authorization
   - Input validation

3. **Medium Priority**: Create `invitation.e2e-spec.ts`
   - End-to-end invitation flow
   - Integration with org/user modules

4. **Low Priority**: Create `out.invitation.dto.spec.ts`
   - DTO transformation specifics
   - Type safety verification

## Test Data Helpers

Consider creating test utilities:
```typescript
// test/utils/invitation-test-helpers.ts
export const createMockInvitation = (overrides = {}) => ({
  _id: new Types.ObjectId(),
  invitedEmail: 'test@example.com',
  role: OrgRole.STAFF,
  status: InvitationStatus.PENDING,
  orgId: new Types.ObjectId(),
  invitedBy: new Types.ObjectId(),
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ...overrides,
});

export const createPopulatedMockInvitation = (overrides = {}) => ({
  ...createMockInvitation(overrides),
  invitedBy: {
    _id: new Types.ObjectId(),
    email: 'inviter@example.com',
    firstName: 'John',
    lastName: 'Doe',
    profilePictureUrl: null,
  },
  orgId: {
    _id: new Types.ObjectId(),
    name: 'Test Organization',
  },
});
```

## Related Documentation
- [Testing Guidelines](../../../docs/TestingGuidelines.md)
- [Invitation API Documentation](../../../docs/api/invitation.md)
- [Coding Guidelines](../../../docs/CodingGuidelines.md)
