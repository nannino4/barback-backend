# Invitation Management API Documentation

## Overview
The Invitation Management module handles organization invitations, allowing owners and managers to invite users via email. As of 2025-09 refactor, invitations can only be accepted or declined by existing, authenticated users. Anonymous (pre-registration) acceptance/decline has been removed to ensure explicit account ownership and reduce orphaned membership scenarios. Email notification now contains a generic "View Invitations" CTA; the previous token-based public accept/decline flow was removed—actions require authentication and invitation lookup is by ObjectId only.

## Invitation Workflow

1. **Send Invitation**: Owner/Manager invites user by email (user may or may not already exist)
2. **Email Notification**: Invited email receives link directing user to login or register
3. **User Registration (if needed)**: If the email is not yet associated with an account, user completes normal registration flow
4. **Accept/Decline (Authenticated)**: Authenticated user accepts or declines invitation; acceptance immediately creates membership (idempotent if already a member)
5. **Join Organization**: Accepted invitations create organization membership immediately

## Endpoints for Organization Owners/Managers

### POST /api/orgs/:orgId/invitations
Send an invitation to join the organization.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)

**Request Body**:
```json
{
  "invitedEmail": "newuser@example.com",
  "role": "STAFF"
}
```

**Validation Rules**:
- `invitedEmail`: Must be valid email format, required
- `role`: Must be valid organization role (STAFF, MANAGER), cannot be OWNER

**Response** (201 Created):
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "invitedEmail": "newuser@example.com",
  "role": "STAFF",
  "status": "PENDING",
  "invitedBy": {
    "id": "64a1b2c3d4e5f6789abc456",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "organization": {
    "id": "64a1b2c3d4e5f6789def789",
    "name": "My Bar Organization"
  },
    "createdAt": "2024-01-01T00:00:00.000Z",
  "expiresAt": "2024-01-08T00:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Invalid/Expired Token:
```json
{
  "message": "Invalid or expired invitation token",
  "error": "Not Found",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation lookup by token - Query timeout",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Purpose**:
- Allows frontend to display invitation details before requiring user to register/login
- Used to show organization name and inviter information on invitation pages

**Notes**:
- No authentication required - token acts as authorization
- Returns minimal, safe information only
- Used for preview before user decides to register/login

---

### GET /api/orgs/:orgId/invitations
Get all pending invitations for the organization.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "invitedEmail": "user1@example.com",
    "role": "STAFF",
    "status": "PENDING",
    "invitedBy": {
      "id": "64a1b2c3d4e5f6789abc456",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  },
  {
    "id": "64a1b2c3d4e5f6789abc124",
    "invitedEmail": "user2@example.com",
    "role": "MANAGER",
    "status": "PENDING",
    "invitedBy": {
      "id": "64a1b2c3d4e5f6789abc456",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-02T00:00:00.000Z",
    "expiresAt": "2024-01-09T00:00:00.000Z"
  }
]
```

**Error Responses**:

**400 Bad Request** - Invalid Organization ID:
```json
{
  "message": "Invalid ObjectId format",
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient Role:
```json
{
  "message": "Insufficient role for this operation",
  "error": "INSUFFICIENT_ROLE", 
  "statusCode": 403
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation lookup by organization - Connection lost",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Only returns pending invitations (not accepted, declined, or revoked)
- Results are sorted by creation date (newest first)
- Empty array returned if no pending invitations exist

---

### DELETE /api/orgs/:orgId/invitations/:invitationId
Revoke a pending invitation.

**Authentication**: Required (JWT)
**Authorization**: Owner or Manager only

**Parameters**:
- `orgId` (path): Organization ID (must be valid ObjectId)
- `invitationId` (path): Invitation ID (must be valid ObjectId)

**Response** (200 OK): Updated invitation resource
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "invitedEmail": "user1@example.com",
  "role": "STAFF",
  "status": "REVOKED",
  "invitedBy": "64a1b2c3d4e5f6789abc456",
  "orgId": "64a1b2c3d4e5f6789def789",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:05.000Z",
  "invitationExpires": "2024-01-08T00:00:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Invalid ObjectId Format:
```json
{
  "message": "Invalid ObjectId format",
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient Role:
```json
{
  "message": "Insufficient role for this operation",
  "error": "INSUFFICIENT_ROLE",
  "statusCode": 403
}
```

**404 Not Found** - Invitation Not Found:
```json
{
  "message": "Invitation with identifier \"64a1b2c3d4e5f6789abc123\" not found",
  "error": "INVITATION_NOT_FOUND",
  "statusCode": 404
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation revocation - Transaction failed",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Only pending invitations can be revoked
- Already processed invitations (accepted, declined, expired) cannot be revoked
- Revoked invitations cannot be restored

---

## Endpoints for Invited Users

### GET /api/invites
Get current user's pending invitations.

**Authentication**: Required (JWT)

**Response** (200 OK):
```json
[
  {
    "id": "64a1b2c3d4e5f6789abc123",
    "invitedEmail": "user1@example.com",
    "role": "STAFF",
    "status": "ACCEPTED",
    "invitedBy": "64a1b2c3d4e5f6789abc456",
    "orgId": "64a1b2c3d4e5f6789def789",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "invitationExpires": "2024-01-08T00:00:00.000Z"
  }
]
```

**Error Responses**:

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation lookup by email - Connection timeout",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Shows invitations for the authenticated user's email address only
- Only returns pending, non-expired invitations
- Excludes sensitive information (inviter's email, internal IDs)

---

### POST /api/invites/:invitationId/accept
Accept an invitation (authenticated users) by id.

**Authentication**: Required (JWT)

**Parameters**:
- `invitationId` (path): Invitation id (Mongo ObjectId)

**Response** (200 OK): Updated invitation resource
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "invitedEmail": "user1@example.com",
  "role": "STAFF",
  "status": "ACCEPTED",
  "invitedBy": "64a1b2c3d4e5f6789abc456",
  "orgId": "64a1b2c3d4e5f6789def789",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "invitationExpires": "2024-01-08T00:00:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Invalid/Expired Invitation:
```json
{
  "message": "Invalid or expired invitation",
  "error": "INVALID_INVITATION",
  "statusCode": 400
}
```

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation acceptance - Transaction timeout",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Effects**:
- Creates user-organization relationship with specified role
- Marks invitation as accepted
- User gains immediate access to organization resources
- Invitation can no longer be accepted again

**Notes**:
- Invitation can only be accepted once
- User must be authenticated to accept invitations
- If user is already a member, invitation is marked as accepted without creating duplicate relationship

---

### POST /api/invites/:invitationId/decline
Decline an invitation (authenticated users) by id.

**Authentication**: Required (JWT)

**Parameters**:
- `invitationId` (path): Invitation id (Mongo ObjectId)

**Response** (200 OK): Updated invitation resource
```json
{
  "id": "64a1b2c3d4e5f6789abc123",
  "invitedEmail": "user1@example.com",
  "role": "STAFF",
  "status": "DECLINED",
  "invitedBy": "64a1b2c3d4e5f6789abc456",
  "orgId": "64a1b2c3d4e5f6789def789",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "invitationExpires": "2024-01-08T00:00:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Invalid/Expired Invitation:
```json
{
  "message": "Invalid or expired invitation", 
  "error": "INVALID_INVITATION",
  "statusCode": 400
}
```

**401 Unauthorized** - Authentication Required:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: invitation decline - Update operation failed",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**Effects**:
- Marks invitation as permanently declined
- User will not be added to organization
- Invitation cannot be acted upon again

**Notes**:
- Declined invitations cannot be re-accepted
- User must be authenticated to decline invitations

---

## Data Models

### Invitation Object
```json
{
  "id": "string",           // MongoDB ObjectId
  "email": "string",        // Invited email address
  "orgRole": "MANAGER|STAFF", // Role in organization
  "status": "PENDING|ACCEPTED|DECLINED|REVOKED|EXPIRED", // Invitation status
  "invitedBy": {            // User who sent invitation
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string"
  },
  "organization": {         // Organization details
    "id": "string",
    "name": "string"
  },
  "createdAt": "string",    // ISO timestamp
  "expiresAt": "string"     // ISO timestamp (7 days from creation)
}
```

### Public Invitation Object (limited fields)
```json
{
  "id": "string",
  "orgRole": "MANAGER|STAFF",
  "status": "PENDING",
  "organization": {
    "id": "string",
    "name": "string"
  },
  "invitedBy": {
    "firstName": "string",
    "lastName": "string"
  },
  "createdAt": "string",
  "expiresAt": "string"
}
```